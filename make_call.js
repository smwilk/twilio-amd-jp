require("dotenv").config()

// Twilio authentication information
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const outgoingPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const callBackDomain = process.env.NGROK_URL

// Import dependencies and resources
const express = require("express")
const client = require("twilio")(accountSid, authToken)
const deliveryData = require("./delivery_data.json")

// Create global app object and port
const app = express()
const port = 3000

// Express config to parse incoming requests with JSON payloads
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// Global variables for the app
let earliestDeliveryTime = ""
let latestDeliveryTime = ""

// Make a call
const makeCall = (data) => {
  earliestDeliveryTime = deliveryData[0].deliveryTime.split("-")[0]
  latestDeliveryTime = deliveryData[0].deliveryTime.split("-")[1]
  console.log("Making a call to:", data.phoneNumber)
  client.calls
    .create({
      machineDetection: "DetectMessageEnd",
      asyncAmd: true,
      asyncAmdStatusCallback: callBackDomain + "/amd-callback",
      twiml: '<Response><Say language="ja-JP">Twilio Logisticsです。メッセージを取得しています。</Say><Pause length="10"/></Response>',
      to: data.phoneNumber,
      from: outgoingPhoneNumber,
      statusCallback: callBackDomain + "/status-callback",
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    })
    .catch(error => {console.log(error)})
}

// Log call status
app.post('/status-callback', function (req, res) {
  console.log(`Call status changed: ${req.body.CallStatus}`)
  res.sendStatus(200)
})

// Handle AMD process
app.post("/amd-callback", function (req, res) {
  const callAnsweredByHuman = req.body.AnsweredBy === "human"
  const deliveryId = deliveryData[0].id
  const deliveryMessage = `Twilio Logisticsよりお荷物お届けのお知らせです。本日${earliestDeliveryTime}時から${latestDeliveryTime}時の間にお荷物をお届けいたします。`

  if (callAnsweredByHuman) {
    console.log("Call picked up by human")
    // Update ongoing call and play a delivery message
    client.calls(req.body.CallSid)
      .update({twiml: `<Response><Pause length="1"/><Say language="ja-JP">${deliveryMessage}</Say></Response>`})
      .catch(err => console.log(err))
  } else  {
    const smsReminder = `Twilio Logisticsよりお荷物お届けのお知らせです。本日注文番号${deliveryId}のお荷物を${earliestDeliveryTime}時から${latestDeliveryTime}時の間にお届けいたします。`
    console.log("Call picked up by machine")
    // Update ongoing call, play a delivery message and send an SMS reminder
    client.calls(req.body.CallSid)
      .update({twiml: `<Response><Pause length="1"/><Say language="ja-JP">${deliveryMessage}SMSでリマインドをお送りいたします。</Say><Pause length="1"/></Response>
    `})
      .then(call =>      
        client.messages
          .create({body: smsReminder, from: call.from, to: call.to })
          .then(message => console.log("message:", message.sid)))
      .catch(err => console.log(err))
  }
  res.sendStatus(200)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})

// Execute call function
makeCall(deliveryData[0])