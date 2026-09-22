/*
  VYOMA - ESP8266 telemetry sender (reference sketch)

  Reads DHT22, MQ-09 (and optional MQ-135), flame sensor and MPU6050,
  then POSTs one JSON telemetry point to the dashboard backend every
  ~150ms over Wi-Fi. Swap in your own sensor wiring/libraries; the
  important part is the JSON shape and the X-Device-Key header, which
  must match DEVICE_KEY in the backend's .env file.

  Libraries needed (Arduino Library Manager):
    - ESP8266WiFi, ESP8266HTTPClient (bundled with ESP8266 board package)
    - ArduinoJson
    - DHT sensor library (Adafruit)
    - Adafruit MPU6050 + Adafruit Unified Sensor
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

const char* WIFI_SSID = "your-wifi-name";
const char* WIFI_PASSWORD = "your-wifi-password";

// IP/port of the laptop running the VYOMA backend (see Settings page)
const char* SERVER_URL = "http://192.168.1.50:4000/api/telemetry";
const char* DEVICE_KEY = "vyoma-device-key"; // must match backend .env

#define DHTPIN D3
#define DHTTYPE DHT22
#define MQ09_PIN A0
#define FLAME_PIN D0

DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(FLAME_PIN, INPUT);

  if (!mpu.begin()) {
    Serial.println("MPU6050 not found - check wiring.");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nConnected: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(500);
    return;
  }

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  StaticJsonDocument<512> doc;
  doc["timestamp"] = millis();
  doc["temperature"] = dht.readTemperature();
  doc["humidity"] = dht.readHumidity();
  doc["mq09"] = analogRead(MQ09_PIN);
  doc["flame"] = digitalRead(FLAME_PIN) == LOW; // most flame sensors pull LOW when triggered

  JsonObject accel = doc.createNestedObject("accel");
  accel["x"] = a.acceleration.x;
  accel["y"] = a.acceleration.y;
  accel["z"] = a.acceleration.z;

  JsonObject gyro = doc.createNestedObject("gyro");
  gyro["x"] = g.gyro.x * 57.2958; // rad/s -> deg/s
  gyro["y"] = g.gyro.y * 57.2958;
  gyro["z"] = g.gyro.z * 57.2958;

  String payload;
  serializeJson(doc, payload);

  WiFiClient client;
  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST(payload);
  if (code <= 0) {
    Serial.println("POST failed: " + http.errorToString(code));
  }
  http.end();

  delay(150); // ~6-7 Hz - raise/lower to match your mission needs
}
