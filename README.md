This is a sample delivery reminder system made with [Twilio's AMD](https://www.twilio.com/docs/voice/answering-machine-detection).

1. Install dependencies

```bash
npm install
```

2. Expose your `localhost:3000` to the web using ngrok:

```bash
ngrok http 3000
```

3. Create a *.env* file, add these environment variables:

```
TWILIO_ACCOUNT_SID=XXXXX
TWILIO_AUTH_TOKEN=XXXXX
TWILIO_PHONE_NUMBER=XXXXX
NGROK_URL=XXXXX
```

4. Add your recipient phone number to *delivery-data.json*:

```json
[
  {
    "id": 123456,
    "name": "Customer 1",
    "phoneNumber": "{insert your phone number here}",
    "deliveryTime": "17-19"
  }
]
```

4. Run the app:

```bash
node make-call.js
```