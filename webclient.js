const settings = require("./settings");
const Promise = require("promise");
const https = require("https");
const moment = require("moment");
const xmldoc = require("xmldoc");

function WebClient(){
    var _getUrl = (sd, ed) => {
        return "https://secure.a2gov.org/WaterConsumption/DownloadData.aspx"
            + "?meterID=" + encodeURIComponent(settings.meterId)
            + "&startDate=" + encodeURIComponent(sd.format("M/D/YYYY"))
            + "&endDate=" + encodeURIComponent(ed.format("M/D/YYYY"))
    };

    this.getUsage = function(sd, ed){
        return new Promise(resolve => {            
            let req = https.get(_getUrl(sd, ed), res => {
                res.setEncoding("utf8");
                
                let body = "";
                
                res.on("data", data => {
                    body += data;
                });
                
                res.on("end", () => {
                    let xdoc = new xmldoc.XmlDocument(body);
                    let rows = xdoc.childrenNamed("tr");
                    
                    let result = [];
                    
                    rows.forEach((r, i) => {
                        if (i > 0){ // skips the header row
                            let cells = r.childrenNamed("td");
                            result.push({
                                meterId: settings.meterId,
                                date: moment(cells[0].val, "M/D/YYYY").toDate(),
                                lastMeterReading: parseInt(cells[1].val),
                                dailyUsageCcf: parseFloat(cells[2].val),
                                dailyUsageGal: parseFloat(cells[3].val)
                            });
                        }
                    });
                    
                    resolve(result);
                });
            });

            req.on("error", err => {
                throw err;
            });
        });
    };
}

module.exports = new WebClient();