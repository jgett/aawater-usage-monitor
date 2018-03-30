const settings = require("./settings");
const Promise = require("promise");
const MongoClient = require('mongodb').MongoClient;

var Repository = function(){
    const DB_NAME = "aawater";
    const COL_NAME = "usage";

    var _findRecent = (col, limit, cb) => {    
        col.find({"meterId": settings.meterId}).sort({"date": -1}).limit(limit).toArray((err, docs) => {
            if (err) cb(err, null);
            else cb(null, docs);
        });
    };

    var _removeDocuments = (col, docs, cb) => {
        let objIds = docs.map(x => x._id);
        let filter = {"_id": {$in: objIds}};
        col.remove(filter, cb);
    };

    this.insert = function(docs){
        return new Promise(resolve => {
            MongoClient.connect(settings.mongoUrl, (err, client) => {
                if (err) throw err;
                
                const db = client.db(DB_NAME);
                const col = db.collection(COL_NAME);
                
                col.insert(docs, (err, result) => {
                    if (err) throw err;
                    resolve(result.ops);
                    client.close();
                });
            });
        });
    };
    
    this.findRecent = function(limit){
        return new Promise(resolve => {
            MongoClient.connect(settings.mongoUrl, (err, client) => {
                if (err) throw err;
                
                const db = client.db(DB_NAME);
                const col = db.collection(COL_NAME);
                
                _findRecent(col, limit, (err, docs) => {
                    if (err) throw err;
                    resolve(docs);
                    client.close();
                });
            });
        });
    };
    
    this.findAll = function(){
        return new Promise(resolve => {
            MongoClient.connect(settings.mongoUrl, (err, client) => {
                if (err) throw err;
                
                const db = client.db(DB_NAME);
                const col = db.collection(COL_NAME);
                
                col.find({"meterId": settings.meterId}).sort({"date": -1}).toArray((err, docs) => {
                    if (err) throw err;
                    resolve(docs);
                    client.close();
                });
            });
        });
    };
    
    this.removeRecent = function(limit){
        return new Promise(resolve => {
            MongoClient.connect(settings.mongoUrl, (err, client) => {
                if (err) throw err;

                const db = client.db(DB_NAME);
                const col = db.collection(COL_NAME);
                
                _findRecent(col, limit, (err, docs) => {
                    if (err) throw err;
                    
                    _removeDocuments(col, docs, (err, result) => {
                        if (err) throw err;
                        resolve(result.result.n);
                        client.close();
                    });
                });                
            });
        });
    };
    
    this.removeAll = function(){
        return new Promise(resolve => {
            MongoClient.connect(settings.mongoUrl, (err, client) => {
                if (err) throw err;
                
                const db = client.db(DB_NAME);
                const col = db.collection(COL_NAME);
                
                col.remove({"meterId": settings.meterId}, (err, result) => {
                    if (err) throw err;
                    resolve(result.result.n);
                    client.close();
                });
            });
        });
    };
};

module.exports = new Repository();