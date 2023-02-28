const App = require('../model/app');
exports.insertApp = (req, res) => {
 // create new app in mongodb
 const app = new App(req.body);
 app.save((err, data) => {
     if (err) {
        return res.status(400).json({
            error: 'app not saved in DB'+ err
        });
     }
     res.json({ data });
 });

  
};





/**
 * google login full
 * https://www.udemy.com/instructor/communication/qa/7520556/detail/
 */
