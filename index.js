/* 
    This script should be executed via cron or Windows Task Manager once per day (or whatever frequency you want).
    There is no reason to run it more than once a day because per-day is the minimum granularity of data provided.
*/

const Promise = require("promise");
const moment = require("moment");
const settings = require('./settings');
const repo = require("./repo");
const email = require("./email");
const webclient = require("./webclient");

const log = (msg, obj) => {
    console.log('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + msg);
    if (obj) console.log(obj);
};

const error = err => {
    log("an error occurred");
    if (err) console.error(err);
};

const sortUsage = usage => {
    if (usage && usage.length){
        return usage.sort((a, b) => {
            a = moment(a.date);
            b = moment(b.date);
            return a.isAfter(b) ? -1 : a.isBefore(b) ? 1 : 0;
        });
    }
    
    return null;
};

// returns the input docs if there are any, or else the result of inserting new docs
const firstRunCheck = docs => {
    if (docs.length > 0)
        return Promise.resolve(docs);
    
    // first run
    let sd = moment(settings.startDate);
    let ed = moment().startOf('day');
    
    log('getting data from web...');
    return webclient.getUsage(sd, ed).then(usage => {
        log('getting data complete');
        return repo.insert(usage).then(inserted => {
           log("inserted documents: " + inserted.length );
           return Promise.resolve(inserted);
        });
    });
};

// checks the most recent usage to see if an update is needed
const checkUsage = docs => {
    let mostRecent = sortUsage(docs)[0];
    let usageDate = moment(mostRecent.date);
    
    log("checking: " + usageDate.format("YYYY-MM-DD"));
    
    let m = moment().startOf("day").add(-1, "days");        
    
    if (usageDate.isBefore(m)){
        log("update needed");
        
        let sd = usageDate.clone().add(1, "days");
        let ed = moment().startOf("day");
        
        return webclient.getUsage(sd, ed).then(usage => {
            log("found usage: " + usage.length);
            return repo.insert(usage).then(inserted => {
                log("inserted documents: " + inserted.length );
                return Promise.resolve(sortUsage(docs.concat(inserted)));
            });
        });
    }
    
    return Promise.resolve(docs);
};

// determines if mail needs to be sent and sends it if necessary
const sendEmail = usage => {
    let mostRecent = usage[0];
    let m = moment(mostRecent.date);
    
    log("most recent is now: " + m.format("M/D/YYYY"));
    
    let overLimit = settings.limit && mostRecent.dailyUsageGal >= settings.limit;
    
    if (settings.daily || overLimit){
        let subject = "Ann Arbor Water Usage for " + m.format("M/D/YYYY") + " (checked at " + moment().format("M/D/YYYY h:mm:ss A") + ")";
        let body = "You used " + mostRecent.dailyUsageGal + " gallons of water on " + m.format("M/D/YYYY") + "."
        
        if (overLimit){
            subject = "***** OVER LIMIT ***** " + subject;
            body += ' Your usage limit was exceeded by ' + (mostRecent.dailyUsageGal - settings.limit).toFixed(2) + ' gallons!';
        }
        
        log("sending email...");
        return email.send(subject, body).then(info => {
            log("email sent");
            return Promise.resolve(info.accepted[0] === settings.email.recipient);
        });
    }
    
    return Promise.resolve(false);
};
    
repo.findRecent(3)
    .then(firstRunCheck)
    .then(checkUsage)
    .then(sendEmail)
    .catch(error);