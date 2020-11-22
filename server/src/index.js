/* ---------------- DOTENV ----------------------*/
require("dotenv").config()

/* ---------------- child_process ---------------*/
const spawn = require("child_process");

/* ----------------- EXPRESS --------------------*/
const express = require("express");
const cors = require("cors"); 
const app = express();
const port = process.env.SERVER_PORT;

/* --- FS --- */
const fs = require("fs");

/* ___ CORS ___ */
app.use(cors());


/* --- BODY-PARSER --- */
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



/* ----------------- MONGODB --------------------*/
// Connect to mongodb
const mongoose = require("mongoose");

mongoose.connect(process.env.DB_URL + process.env.DB_TABLE,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

var {UserModel, DeviceModel, DeviceUsageModel} = require("./models/user.js");

/* ----------------- BCRYPT --------------------*/
var bcrypt  = require("bcrypt");

app.get("/api/", (req,res) => {
    res.send("This is the backend server for our codefest2020 project. For the frontend use port 3001");
});

app.post("/api/login", (req,res) => {
    let { username, password } = req.body;

    if(!username || !password ) {
        res.sendStatus(400);
        return;
    }
    UserModel.findOne({username:username}).then(user => {
        if(!user){
            res.status(401).send("User not found");
        }
        bcrypt.compare(password, user.password, (err, result)=>{
            if( result ) {
                res.send(user);
            } else {
                res.status(401).send("error logging in");
            };
        });

    }).catch(err => console.log(err));
})

app.post("/api/register", (req,res) => {
    let { username, password } = req.body;
    if (!username || !password) {
        res.sendStatus(400);
        return;
    } 

    bcrypt.hash(password, 10/* salt */, (err, hash) =>{
        const newUser = new UserModel({
            username:username,
            password: hash,
            devices: []
        });
        newUser.save()
        .then(() => {
            res.redirect("./dashboard")
        })
        .catch((err) =>{
            console.log("Failed to register user ("+ username +"): Already Exists");
            res.status(401).send("User already exists"); });
    })
});

app.post("/api/addDevice", (req, res) => {
    console.log(req.body.deviceName);
    UserModel.findOne({username: req.body.username}, (err,user) => {
        if (err) {
            res.status(500).send("Failed to find user");
        }
        const newDevice= new DeviceModel({
            name:req.body.deviceName,
            usage:[]
        });
        console.log(user);

        user.devices.push(newDevice);
        user.save()
        .then(() => {
            res.send(user);
        }).catch((err) => {
            console.log(err);
            res.status(500).send("that sucked");
        });
    });
});


app.post("/api/logout", (req, res) => {
	res.status(200);
	res.redirect("/");
});

app.get("/api/statsidk", (req,res) => {
    DeviceModel.find({},(err,devices) =>{
        if(err){
            res.status(500).send("Failed to get all devices");
            return;
        }
        res.send(devices);
    });
});

app.post("/api/_get_user", (req, res) => {
    UserModel.find({"username": req.body.username},(err,user) =>{
        if(err){
            res.status(500).send("Failed to get all devices");
            return;
        }
        res.send(user.devices);
    });
});

app.post("/api/log_usage", (req,res) => {
    console.log("received:", req.body.amount);
    UserModel.findOne({username:req.body.username}).then(user => {
        if(!user){
            res.status(401).send("User(" + req.body.username +") not found");
            return;
        }
        user.devices.forEach(device => {
            if (device.name === req.body.device) {
                /* Usage comes in as Liters convert to db which uses gallons */
                const usage = new DeviceUsageModel({
                    date: new Date(),
                    amount: 0.264172 * req.body.amount
                })
                device.usage.push(usage);
            }
        })
        // TODO: handle this callback
        user.save(()=>{res.send("Done")});

    })
    .catch(err => {
        res.status(500).send("Error searching in database");
        console.log(err)
    });
});

app.post("/api/predict_weather", (req,res) => {
    const pyprog = spawn('python3', ["./externals/predict_weather.py --lat " + req.body.lat + " --lon " + req.body.lon]);
    pyprog.stdout.on('data', (data) => {
        res.send(data);
    });
    pyprog.stderr.on('data', (data) => {
        res.send(data);
    });
});

/*
app.get("/api/insertDevices", (req,res) => {
    fs.readFile("/home/dennis/codefest-2020/server/src/dataset.txt", "utf8", (err, data) => {
        if (err) throw err;


        var newDevices = {};

        var lines = data.split("\r\n");
        for(var i = 0; i<lines.length; i++) {
            var c = lines[i].split(",");
            if (c.length === 3) {
                var device = c[0].replace("\t", "");
                var date = new Date(c[1].replace("\t", "") + " 2020");
                var amount = c[2].replace("\t", "");
            }

           const newUsage = new DeviceUsageModel({
                date: date,
                amount: amount
            });

            if (newDevices[device]) {
                newDevices[device].push(newUsage);
            } else {
                newDevices[device] = [newUsage];
            }
        }

        for(var device in newDevices){
            const newDevice = new DeviceModel({
                name: device,
                usage: newDevices[device]
            })

            UserModel.findOne({username: "dennis"}, (err, user) => {
                if (err) {
                    res.status(500).send("failed to find user");
                }
                user.devices.push(newDevice);
                user.save()
                    .then(() => res.send(user))
                    .catch(() => res.status(500).send("that sucked"));
            });
        }

    });

});
*/

app.listen(port, () => {
  console.log(`Server at http://localhost:${port}`)
});

