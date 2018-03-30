const settings = require("./settings");
const Promise = require("promise");
const nodemailer = require("nodemailer");

function Email(){
    var transporter = nodemailer.createTransport(settings.email.options);

    this.send = function(subject, body){
        return new Promise(resolve => {
            const opts = {
                "from": settings.email.sender,
                "to": settings.email.recipient,
                "subject": subject,
                "html": body
            };

            transporter.sendMail(opts, (err, info) => {
                if (err) throw err;
                resolve(info);
            });
        });
    };
}

module.exports = new Email();