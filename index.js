const Promise = require("promise");
const SMTPConnection = require('nodemailer/lib/smtp-connection');
const MongoClient = require('mongodb').MongoClient;
const https = require("https");
const moment = require("moment");
const xmldoc = require("xmldoc");
const settings = require('./settings');

const getUrl = (sd, ed) => {
	return "https://secure.a2gov.org/WaterConsumption/DownloadData.aspx"
		+ "?meterID=" + encodeURIComponent(settings.meterId)
		+ "&startDate=" + encodeURIComponent(sd.format("M/D/YYYY"))
		+ "&endDate=" + encodeURIComponent(ed.format("M/D/YYYY"))
};

const log = msg => {
    console.log('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + msg);
};

const error = err => {
    log("an error occurred");
    console.error(err);
};

const getUsageData = (sd, ed) => {
    return new Promise((resolve, reject) => {
        log('getting data from web...');
        
        let req = https.get(getUrl(sd, ed), res => {
            res.setEncoding("utf8");
            
            let body = "";
            
            res.on("data", data => {
                body += data;
            });
            
            res.on("end", () => {
                var xdoc = new xmldoc.XmlDocument(body);
                var rows = xdoc.childrenNamed("tr");
                
                var result = [];
                
                rows.forEach((r, i) => {
                    if (i > 0){
                        var cells = r.childrenNamed("td");
                        result.push({
                            meterId: settings.meterId,
                            date: moment(cells[0].val, "M/D/YYYY").toDate(),
                            lastMeterReading: parseInt(cells[1].val),
                            dailyUsageCcf: parseFloat(cells[2].val),
                            dailyUsageGal: parseFloat(cells[3].val)
                        });
                    }
                });
                
                log('getting data complete');
                
                resolve(result);
            });
        });

        req.on("error", err => {
            reject(err);
        });
    });
};

const sendEmail = (msg) => {
    return new Promise((resolve, reject) => {
        let connection = new SMTPConnection(settings.email.options);
        connection.login(settings.email.credentials, err => {
            if (err){
                reject(err);
            }else{
                resolve();
            }
        });
    });
};

MongoClient.connect(settings.mongoUrl, (err, client) => {
	const db = client.db("aawater");
	
	// need to check if there is any data
	const col = db.collection("usage");
    
    const insertUsageData = (usage) => {
        return new Promise((resolve, reject) => {
            col.insert(usage, (err, result) => {
                if (err){
                    reject(err);
                }else{
                    log('inserted documents: ' + result.result.n);
                    resolve(result.ops);
                }
            });
        });
    };
    
    // returns usage - the input usage if there is any, or else the result of inserting new documents
    const firstRunCheck = (usage) => {
        return new Promise((resolve, reject) => {
            if (usage.length === 0){
                // first run
                var sd = settings.startDate.clone();
                var ed = moment().startOf('day');
                
                getUsageData(sd, ed).then(usage => {
                    insertUsageData(usage).then(resolve);
                }, reject);
            } else {
                resolve(usage);
            }
        });
    };
	
    col.find({"meterId": settings.meterId}).sort({"date": -1}).limit(1).toArray((err, docs) => {
        if (err) error(err);
        
        firstRunCheck(docs).then(usage => {            
            if (usage.length > 0){
                let mostRecentUsage = usage.sort((a, b) => {
                    a = moment(a.date);
                    b = moment(b.date);
                    return a.isAfter(b) ? -1 : a.isBefore(b) ? 1 : 0;
                })[0];
                
                console.log(mostRecentUsage);
            }else{
                log('no usage found');
            }
            
            client.close();
        }, err => {
            error(err);
            client.close();
        });
    });
});

