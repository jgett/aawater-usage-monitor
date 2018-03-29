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

const getData = (sd, ed, cb) => {
	https.get(getUrl(sd, ed), res => {
		res.setEncoding("utf8");
		
		let body = "";
		
		res.on("data", data => {
			body += data;
		});
		
		res.on("end", () => {
			var xdoc = new xmldoc.XmlDocument(body);
			var table = xdoc.childNamed("table");
			var rows = table.childrenNamed("tr");
			
			cb(xdoc);
		});
	});
};

MongoClient.connect(settings.mongoUrl, (err, client) => {
	const db = client.db("aawater");
	
	// need to check if there is any data
	const col = db.collection("usage");
	
	col.find({"meterId": settings.meterId}).toArray((err, docs) => {
		if (docs.length === 0){
			// first run
			var sd = settings.startDate.clone();
			var ed = moment().startOf('day');
			
			getData(sd, ed, data => {
				console.log(data);
			});
		}
	});
	
	
	
	client.close();
});

