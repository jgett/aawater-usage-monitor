# aawater-usage-monitor

This is a script for Ann Arbor, MI residents who want to monitor their water usage. It will send email alerts either daily (i.e. whenever the script is run) or whenever usage exceeds a predefined limit, depending on your settings.

### Requirements

Data is saved in your MongoDB instance. If you do not already have this installed visit https://www.mongodb.com/download-center to download. With your usage data in mongo, you can query it and make beautiful graphs and stuff.

### Installation

1. Clone this repository
1. Run `npm install`
1. Copy the file settings.js.sample to settings.js and edit it using appropriate values
1. Create a cron job or Windows scheduled task to execute the script once per day (whatever time you want)

### How It Works

You can get your meter id from the a2gov.org website (see settings.js.sample for more information). This id is used to retrieve data from this public url: `https://secure.a2gov.org/WaterConsumption/DownloadData.aspx` (don't go here without the querystring parameters or else you'll get an unhandled exception), with the following querystring parameters:
* meterID
* startDate
* endDate

The script checks for saved data in your local MongoDB database retrieves any missing data from a2gov.org if necessary. An email is sent using the email service you provide (for example gmail) which is configured in settings.js. The email can be sent everyime the script runs, only when your daily usage exceeds a predefined limit, or never (when settings.daily == false, and settings.limit == 0).
