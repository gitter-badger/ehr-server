/**
 * Created by Louis on 15/8/2015.
 */
var express = require('express');
var router = express.Router();
var ba = require('basic-auth');
var pg = require('pg');
var moment = require('moment');
var util = require('../utils');
var valid = require('../valid');
var db = require('../database');
var sql = require('sql-bricks-postgres');
var patient_table = 'patient';
var visit_table = 'visit';
var triage_table = 'triage';
var consultation_table = 'consultation';
var pharmacy_table = 'pharmacy';

/* GET with patient id + basic auth */
router.get('/:id', function(req, res) {
    var temp_patient = JSON.parse('{"id":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","name":{"firstname":"Tsz Ho","middlename":"XXXX","lastname":"Tsai"},"birthday":{"year":1994,"month":9,"day":16},"gender":"male","race":"Mongolian","address":{"apartment":"A","floor":"99","village":"Sth","building":"Sth else","street":"sth street","province":"somewhere","country":"Cambodia"},"picture_id":"1024"}');
    var user = ba(req);
    //console.log(user);
    var message;
    if (req.params.id == temp_patient.id) {
        message = 'are you looking for me? \n' + JSON.stringify(temp_patient) + '\n';
    }
    message = message + 'username = ' + user.name + '\n' + 'password = ' + user.pass + '\n' + 'patient id = ' + req.params.id;
    res.send(message);
});

router.get('/', function (req, res) {
    var sent = false;
    //var body = req.body;
    //var message;
    //message = util.extend_or_replace(message, 'race: ' + body.race + '\n');
    //message = util.extend_or_replace(message, 'gender: ' + body.gender + '\n');
    //message = util.extend_or_replace(message, 'name: ' + body.name + '\n');
    //message = util.extend_or_replace(message, 'birthday: ' + body.birthday + '\n');
    //res.send(message);

    var params = {};
    var param_query = req.query;
    console.log(JSON.stringify(param_query));

    var token = param_query.token;
    if (!token) {
        res.status(499).send('Token is missing');
        sent = true;
    } else {
        db.check_token_and_permission("reset_any_password", token, function (return_value, client) {
            if (!return_value) {                                            //return value == null >> sth wrong
                res.status(400).send('Token missing or invalid');
            } else if (return_value.reset_any_password === false) {          //false (no permission)
                res.status(403).send('No permission');
            } else if (return_value.reset_any_password === true) {           //w/ permission
                //TODO check if token expired
                var next_station = param_query.next_station;
                if (next_station) {
                    params.next_station = next_station;
                }

                //These 3 are mutually exclusive
                var age = param_query.age;
                var age_ot = param_query.age_ot;
                var age_yt = param_query.age_yt;

                //TODO age_ot and age_yt can exist together iff age_yt > age_ot
                switch (util.mutually_exclusive(age, age_ot, age_yt)) {
                    case 0:
                        //Do nothing, LITERALLY
                        break;
                    case 1:
                        if (age) {
                            //TODO calculation
                        } else if (age_ot) {
                            //TODO calculation
                        } else if (age_yt) {
                            //TODO calculation
                        }
                        break;
                    case 2:
                        if (!age) { //i.e. age_ot and age_yt exists
                            if (age_yt - age_ot > 1) {
                                //TODO ok, calculate
                            } else {
                                res.status(409).send('invalid age_ot and age_yt combination');
                            }
                        }
                        break;
                    default:
                        res.status(409).send('age, ago_ot and age_yt must be mutually exclusive');
                        sent = true;
                }

                var slum_id = param_query.slum_id;
                if (slum_id) {
                    params.slum_id = slum_id;
                }

                var gender = param_query.gender;
                if (gender) {
                    params.gender = gender;
                }

                var blood_type = param_query.blood_type;
                if (blood_type) {
                    params.blood_type = blood_type;
                }

                var country_id = param_query.country_id;
                if (country_id) {
                    params.country_id = country_id;
                }

                var email = param_query.email;
                if (email) {
                    //params.email = email;
                    if (valid.email(email) === false) {
                        sent = true;
                        res.status(400).send("invalid email");
                    } else {
                        params.email = email;
                    }
                }

                var first_name = param_query.first_name;
                if (first_name) {
                    params.first_name = first_name;
                }

                var middle_name = param_query.middle_name;
                if (middle_name) {
                    params.middle_name = middle_name;
                }

                var last_name = param_query.last_name;
                if (last_name) {
                    params.last_name = last_name;
                }

                var name = param_query.name;
                if (name) {
                    //TODO search it at first_name OR middle_name OR last_name
                }

                //TODO get this from relationship table
                //var related_to_id = param_query.related_to_id;
                //if (related_to_id) {
                //    params.related_id = related_to_id;
                //}

                //console.log(JSON.stringify(params));

                var sql_query = sql
                    .select()
                    .from('patient')
                    .where(params);

                var offset = param_query.offset;
                if (offset) {
                    sql_query.offset(offset);
                }

                var sort_by = param_query.sort_by;
                if (sort_by) {
                    //TODO check if custom sort by param is valid
                    sql_query.orderBy(sort_by);
                } else {
                    sql_query.orderBy('patient_id');
                }

                var limit = param_query.limit;
                if (limit) {
                    sql_query.limit(limit);
                } else {    //Default limit
                    sql_query.limit(100);
                }

                console.log("The whole query in string: " + sql_query.toString());

                if (sent === false) {
                    client.query(sql_query.toParams().text, sql_query.toParams().values, function (err, result) {
                        if (err) {
                            res.send('error fetching client from pool 2');
                            sent = true;
                            return console.error('error fetching client from pool', err);
                        } else {
                            util.save_sql_query(sql_query.toString());
                            res.json(result.rows);
                        }
                    });
                }
            }
        });
    }
});

/**
 * Add new patient
 */
router.post('/', function (req, res) {
    var sent = false;
    var params = {};
    var param_query = req.query;
    var body = req.body;
    console.log("All input queries: " + JSON.stringify(param_query));
    console.log("The input body: " + JSON.stringify(body));
    //TODO check token validity first
    var token = param_query.token;

    if (!token) {
        res.status(499).send('Token is missing');
        sent = true;
    }else {
        db.check_token_and_permission("add_patient", token, function (return_value, client) {
            if (!return_value) {                                            //false (no token)
                res.status(400).send('Token missing or invalid');
            } else if (return_value.add_patient === false) {          //false (no permission)
                res.status(403).send('No permission');
            } else if (return_value.add_patient === true) {           //true
                //TODO check if token expired
                console.log("return value: " + JSON.stringify(return_value));

                params.patient_id = util.random_string(10);
                params.create_timestamp = moment();
                params.last_seen = moment();
                var honorific = body.honorific;
                var first_name = body.first_name;
                var middle_name = body.middle_name;
                var last_name = body.last_name;
                var phone_number = body.phone_number;
                var address = body.address;
                var date_of_birth = body.date_of_birth;
                var gender = body.gender;
                var photo = body.photo;
                var blood_type = body.blood_type;
                if (honorific) {
                    params.honorific = honorific;
                }
                if (first_name) {
                    params.first_name = first_name;
                }else{
                    res.status(400).send('first_name should be not null');
                }
                if (middle_name) {
                    params.middle_name = middle_name;
                }
                if (last_name) {
                    params.last_name = last_name;
                }

                //TODO select phone_country_id from the phone country input from the request body

                if (phone_number) {
                    params.phone_number = phone_number;
                }
                if (address) {
                    params.address = address;
                }else{
                    res.status(400).send('address should be not null');
                }
                if (date_of_birth) {
                    params.date_of_birth = date_of_birth;
                }
                if (gender) {
                    params.gender = gender;
                }
                if (photo) {
                    params.photo = photo;
                }
                if (blood_type) {
                    params.blood_type = blood_type;
                }

                //TODO select slum_id from the slum input from the request body
                //TODO create function to generate timestamps
                var sql_query = sql.insert(patient_table, params);
                console.log(sql_query.toString());
                client.query(sql_query.toParams().text, sql_query.toParams().values, function (err, result) {
                    if (err) {
                        res.send('error fetching client from pool 3');
                        sent = true;
                        return console.error('error fetching client from pool', err);
                    } else {
                        //util.save_sql_query(sql_query.toString());
                        res.json(result.rows);
                    }
                });
            }
        });
    }
});

router.put('/', function (req, res) {

});

/**
 * get all visits of a patient
 * (unless you know all patient id, you won't be able to get all visits of everyone)
 */
router.get('/visit/:id', function (req, res) {

});

router.post('/visit/', function (req, res) {
    var sent = false;
    var params = {};
    var param_query = req.query;
    var body = req.body;
    console.log("All input queries: " + JSON.stringify(param_query));
    console.log("The input body: " + JSON.stringify(body));
    //TODO check token validity first
    var token = param_query.token;

    if (!token) {
        res.status(499).send('Token is missing');
        sent = true;
    }else {
        db.check_token_and_permission("add_visit", token, function (return_value, client) {
            if (!return_value) {                                            //false (no token)
                res.status(400).send('Token missing or invalid');
            } else if (return_value.add_visit === false) {          //false (no permission)
                res.status(403).send('No permission');
            } else if (return_value.add_visit === true) {           //true
                //TODO check if token expired
                console.log("return value: " + JSON.stringify(return_value));

                params.visit_id = util.random_string(10);
                params.date = moment(Date.now()).format('YYYY-MM-DD');
                params.next_station = "1";
                var patient_id = body.patient_id;
                var tag_number = body.tag_number;
                if (patient_id) {
                    params.patient_id = patient_id;
                }
                if (tag_number) {
                    params.tag_number = tag_number;
                }
                var sql_query = sql.insert(visit_table, params);
                console.log(sql_query.toString());
                client.query(sql_query.toParams().text, sql_query.toParams().values, function (err, result) {
                    if (err) {
                        res.send('error fetching client from pool 3');
                        sent = true;
                        return console.error('error fetching client from pool', err);
                    } else {
                        //util.save_sql_query(sql_query.toString());
                        res.json(result.rows);
                    }
                });
            }
        });
    }
});

router.get('/triage/', function (req, res) {

});

router.post('/triage/', function (req, res) {
    var sent = false;
    var params = {};
    var param_query = req.query;
    var body = req.body;
    console.log("All input queries: " + JSON.stringify(param_query));
    console.log("The input body: " + JSON.stringify(body));
    //TODO check token validity first
    var token = param_query.token;

    if (!token) {
        res.status(499).send('Token is missing');
        sent = true;
    }else {
        db.check_token_and_permission("add_triage", token, function (return_value, client) {
            if (!return_value) {                                            //false (no token)
                res.status(400).send('Token missing or invalid');
            } else if (return_value.add_triage === false) {          //false (no permission)
                res.status(403).send('No permission');
            } else if (return_value.add_triage === true) {           //true
                //TODO check if token expired
                console.log("return value: " + JSON.stringify(return_value));

                params.triage_id = util.random_string(10);
                params.start_time = moment();
                params.end_time = moment();
                var user_id = body.user_id;
                var diastolic = body.diastolic;
                var systolic = body.systolic;
                var heart_rate = body.heart_rate;
                var weight = body.weight;
                var height = body.height;
                var temperature_celsius = body.temperature_celsius;
                var spo2 = body.spo2;
                var marital_status = body.marital_status;
                var respiratory_rate = body.respiratory_rate;
                var last_deworming_date = body.last_deworming_date;
                var currently_pregnant = body.currently_pregnant;
                var currently_breast_feeding = body.currently_breast_feeding;
                var amount_of_child = body.amount_of_child;
                var amount_of_miscarrage = body.amount_of_miscarrage;
                var amount_of_abortion = body.amount_of_abortion;
                var last_menstrual_period = body.last_menstrual_period;
                if (user_id) {
                    params.user_id = user_id;
                }
                if (diastolic) {
                    params.diastolic = diastolic;
                }
                if (systolic) {
                    params.systolic = systolic;
                }
                if (heart_rate) {
                    params.heart_rate = heart_rate;
                }
                if (weight) {
                    params.weight = weight;
                }
                if (height) {
                    params.height = height;
                }
                if (temperature_celsius) {
                    params.temperature_celsius = temperature_celsius;
                }
                if (spo2) {
                    params.spo2 = spo2;
                }
                if (marital_status) {
                    params.marital_status = marital_status;
                }
                if (respiratory_rate) {
                    params.respiratory_rate = respiratory_rate;
                }
                if (last_deworming_date) {
                    params.last_deworming_date = last_deworming_date;
                }
                if (currently_pregnant) {
                    params.currently_pregnant = currently_pregnant;
                }
                if (currently_breast_feeding) {
                    params.currently_breast_feeding = currently_breast_feeding;
                }
                if (amount_of_child) {
                    params.amount_of_child = amount_of_child;
                }
                if (amount_of_miscarrage) {
                    params.amount_of_miscarrage = amount_of_miscarrage;
                }
                if (amount_of_abortion) {
                    params.amount_of_abortion = amount_of_abortion;
                }
                if (last_menstrual_period) {
                    params.last_menstrual_period = last_menstrual_period;
                }
                var sql_query1 = sql.insert(triage_table, params);
                console.log(sql_query1.toString());
                client.query(sql_query1.toParams().text, sql_query1.toParams().values, function (err, result) {
                    if (err) {
                        res.send('error fetching client from pool 3');
                        sent = true;
                        return console.error('error fetching client from pool', err);
                    } else {
                        //util.save_sql_query(sql_query1.toString());

                        var visit_id = body.visit_id;
                        if (visit_id) {
                            params.visit_id = visit_id;
                        }
                        var triage_id =  params.triage_id;
                        var sql_query2 = sql
                            .update(visit_table, {triage_id: triage_id, next_station: '2'})
                          .where(sql('visit_id'), visit_id);

                        console.log("result: " + JSON.stringify(result.rows[0]));
                        console.log("The whole SQL query 2: " + sql_query2.toString());

                        client.query(sql_query2.toParams().text, sql_query2.toParams().values, function (err, result) {
                            if (err) {
                                if (!sent) {
                                    sent = true;
                                    res.status(400).send("error 3");
                                }
                            } else {
                                //util.save_sql_query(sql_query2.toString());

                                res.json(result.rows);
                            }
                        });
                    }
                });
            }
        });
    }
    if (!token) {
        res.status(499).send('Token is missing');
        sent = true;
    }else {
        db.check_token_and_permission("add_triage", token, function (return_value, client) {
            if (!return_value) {                                            //false (no token)
                res.status(400).send('Token missing or invalid');
            } else if (return_value.add_triage === false) {          //false (no permission)
                res.status(403).send('No permission');
            } else if (return_value.add_triage === true) {           //true
                //TODO check if token expired
                console.log("return value: " + JSON.stringify(return_value));

                params.triage_id = util.random_string(10);
                params.start_time = moment();
                params.end_time = moment();
                var user_id = body.user_id;
                var diastolic = body.diastolic;
                var systolic = body.systolic;
                var heart_rate = body.heart_rate;
                var weight = body.weight;
                var height = body.height;
                var temperature_celsius = body.temperature_celsius;
                var spo2 = body.spo2;
                var marital_status = body.marital_status;
                var respiratory_rate = body.respiratory_rate;
                var last_deworming_date = body.last_deworming_date;
                var currently_pregnant = body.currently_pregnant;
                var currently_breast_feeding = body.currently_breast_feeding;
                var amount_of_child = body.amount_of_child;
                var amount_of_miscarrage = body.amount_of_miscarrage;
                var amount_of_abortion = body.amount_of_abortion;
                var last_menstrual_period = body.last_menstrual_period;
                if (user_id) {
                    params.user_id = user_id;
                }
                if (diastolic) {
                    params.diastolic = diastolic;
                }
                if (systolic) {
                    params.systolic = systolic;
                }
                if (heart_rate) {
                    params.heart_rate = heart_rate;
                }
                if (weight) {
                    params.weight = weight;
                }
                if (height) {
                    params.height = height;
                }
                if (temperature_celsius) {
                    params.temperature_celsius = temperature_celsius;
                }
                if (spo2) {
                    params.spo2 = spo2;
                }
                if (marital_status) {
                    params.marital_status = marital_status;
                }
                if (respiratory_rate) {
                    params.respiratory_rate = respiratory_rate;
                }
                if (last_deworming_date) {
                    params.last_deworming_date = last_deworming_date;
                }
                if (currently_pregnant) {
                    params.currently_pregnant = currently_pregnant;
                }
                if (currently_breast_feeding) {
                    params.currently_breast_feeding = currently_breast_feeding;
                }
                if (amount_of_child) {
                    params.amount_of_child = amount_of_child;
                }
                if (amount_of_miscarrage) {
                    params.amount_of_miscarrage = amount_of_miscarrage;
                }
                if (amount_of_abortion) {
                    params.amount_of_abortion = amount_of_abortion;
                }
                if (last_menstrual_period) {
                    params.last_menstrual_period = last_menstrual_period;
                }
                var sql_query1 = sql.insert(triage_table, params);
                console.log(sql_query1.toString());
                client.query(sql_query1.toParams().text, sql_query1.toParams().values, function (err, result) {
                    if (err) {
                        res.send('error fetching client from pool 3');
                        sent = true;
                        return console.error('error fetching client from pool', err);
                    } else {
                        //util.save_sql_query(sql_query1.toString());

                        var visit_id = body.visit_id;
                        if (visit_id) {
                            params.visit_id = visit_id;
                        }
                        var triage_id =  params.triage_id;
                        var sql_query2 = sql
                            .update(visit_table, {triage_id: triage_id, next_station: '2'})
                          .where(sql('visit_id'), visit_id);

                        console.log("result: " + JSON.stringify(result.rows[0]));
                        console.log("The whole SQL query 2: " + sql_query2.toString());

                        client.query(sql_query2.toParams().text, sql_query2.toParams().values, function (err, result) {
                            if (err) {
                                if (!sent) {
                                    sent = true;
                                    res.status(400).send("error 3");
                                }
                            } else {
                                //util.save_sql_query(sql_query2.toString());

                                res.json(result.rows);
                            }
                        });
                    }
                });
            }
        });
    }
});

router.get('/consultation/', function (req, res) {

});

router.post('/consultation/', function (req, res) {

});

router.get('/pharmacy/', function (req, res) {

});

router.post('/pharmacy/', function (req, res) {

});


module.exports = router;