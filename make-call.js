require("dotenv").config()

// Twilioの認証情報を環境変数として設定
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const outgoingPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const callBackDomain = process.env.NGROK_URL

// 依存パッケージやダミーデータをインポート
const express = require("express")
const client = require("twilio")(accountSid, authToken)
const deliveryData = require("./delivery-data.json")

// グローバルappオブジェクトとポートを作成
const app = express()
const port = 3000

// 受信したリクエストをJSONペイロードで解析するためのExpressの設定
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// グローバル変数
let earliestDeliveryTime = ""
let latestDeliveryTime = ""

// 発信処理
const makeCall = (data) => {
  earliestDeliveryTime = deliveryData[0].deliveryTime.split("-")[0]
  latestDeliveryTime = deliveryData[0].deliveryTime.split("-")[1]
  console.log("Making a call to:", data.phoneNumber)
  client.calls
    .create({
      machineDetection: "DetectMessageEnd",
      asyncAmd: true,
      asyncAmdStatusCallback: callBackDomain + "/amd-callback",
      asyncAmdStatusCallbackMethod: "POST",
      twiml: "<Response><Say language='ja-JP'>Twilio Logisticsです。メッセージを取得しています。</Say><Pause length='10'/></Response>",
      to: data.phoneNumber,
      from: outgoingPhoneNumber,
      statusCallback: callBackDomain + "/status-callback",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST"
    })
    .catch(error => {console.log(error)})
}

// 通話ステータスを出力する
app.post("/status-callback", function (req, res) {
  console.log(`Call status changed: ${req.body.CallStatus}`)
  res.sendStatus(200)
})

// AMD判定後の処理
app.post("/amd-callback", function (req, res) {
  const callAnsweredByHuman = req.body.AnsweredBy === "human"
  const deliveryId = deliveryData[0].id
  const deliveryMessage = `Twilio Logisticsよりお荷物お届けのお知らせです。本日${earliestDeliveryTime}時から${latestDeliveryTime}時の間にお荷物をお届けいたします。`

  if (callAnsweredByHuman) {
    // 人間が電話に出た場合の処理
    console.log("Call picked up by human")
    // 進行中の通話を更新し、配達リマインドメッセージを再生する
    client.calls(req.body.CallSid)
      .update({twiml: `<Response><Pause length="1"/><Say language="ja-JP">${deliveryMessage}</Say></Response>`})
      .catch(err => console.log(err))
  } else  {
    // 留守番電話だった場合の処理
    const smsReminder = `Twilio Logisticsよりお荷物お届けのお知らせです。本日注文番号${deliveryId}のお荷物を${earliestDeliveryTime}時から${latestDeliveryTime}時の間にお届けいたします。`
    console.log("Call picked up by machine")
    // 進行中の通話を更新し、配達リマインドメッセージを留守番電話に残す
    client.calls(req.body.CallSid)
      .update({twiml: `<Response><Pause length="1"/><Say language="ja-JP">${deliveryMessage}SMSでリマインドをお送りいたします。</Say><Pause length="1"/></Response>
    `})
      // SMSでリマインダーを送信する
      .then(call =>      
        client.messages
          .create({body: smsReminder, from: call.from, to: call.to })
          .then(message => console.log(message.sid)))
      .catch(err => console.log(err))
  }
  res.sendStatus(200)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})

// 発信を開始
makeCall(deliveryData[0])