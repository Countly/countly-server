// 'every 5 minutes';every 59 mins starting on the 59 min
const pluginManager = require('../../../../plugins/pluginManager'),
  async = require('async');

const countlyDb = pluginManager.dbConnection();

function changeAlertsSchedule() {
  return new Promise((resolve, reject) => {
    countlyDb
      .collection('alerts')
      .updateMany({
        // 'period': 'every 5 minutes',
      }, {
        "$set": {
          "period": 'every 1 hour on the 59th min'
        }
      }, function (err, result) {
        if (err) {
          reject('Change alerts schedule time failed.')
        } else {
          resolve(`Changed alerts schedule time records count: ${result.modifiedCount}`)
        }
      });
  })
}

function getAlerts() {
  return new Promise((resolve, reject) => {
    countlyDb
      .collection('alerts')
      .find({})
      .toArray((err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      })
  })
}

function getCountlyMembers() {
  return new Promise((resolve, reject) => {
    countlyDb
      .collection('members')
      .find({})
      .toArray((err, result) => {
        if (err) {
          return reject(err)
        }
        const memberDict = {}
        result.forEach((i) => {
          memberDict[i._id] = i.email;
        })
        return resolve(memberDict)
      })
  })
}

function updateAlertRecordEmailField(alert) {
  return new Promise((resolve, reject) => {
    countlyDb
      .collection('alerts')
      .updateOne({
        _id: alert._id
      }, {
        $set: {
          alertValues: alert.alertValues
        }
      }, function (err, result) {
        if (err) {
          console.log(err)
          return reject(err)
        }
        console.log('Update alert email sending for alert:', alert._id)
        return resolve(result)
      })
  })
}

async function process() {
  try {
    const changesScheduleResult = await changeAlertsSchedule();
    console.log(changesScheduleResult)

    const members = await getCountlyMembers()
    const alerts = await getAlerts()

    for (let i = 0; i < alerts.length; i++) {
      let needUpdate = false;
      alerts[i].alertValues = alerts[i]
        .alertValues
        .map((userIdOrEmail) => {
          if (members[userIdOrEmail]) {
            needUpdate = true;
          }
          return members[userIdOrEmail] || userIdOrEmail;
        })
      if (needUpdate) {
        await updateAlertRecordEmailField(alerts[i])
      }
    }

  } catch (err) {
    console.log(err)
  }
  countlyDb.close();
}
process()
