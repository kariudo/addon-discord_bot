#!/usr/bin/env bun

import dotenv from "dotenv-defaults";

import type { BotConfig } from "./models/BotConfig";
import { loadConfig } from "./loadConfig";
import { createHandleVoiceStatusUpdate } from "./handleVoiceStatusUpdate";
import { createHandlePresenceUpdate } from "./handlePresenceUpdate";
import { createHandleDiscordReady } from './handleDiscordReady';
import { CreateHandleMqttReady } from './handleMqttConnect';
import { handleMqttError } from './handleMqttError';
import { handleMqttDisconnect } from './handleMqttDisconnect';
import { createHandleMqttMessage } from './handleMqttMessage';
import { createMqttClient } from './mqttClient';
import { createDiscordClient } from './discordClient';
import { Client } from 'discord.js';
import { MqttClient } from 'mqtt';

// Load environment variables
dotenv.config({
  path: "./.env",
  encoding: "utf8",
  defaults: "./.env.defaults",
});

export let config: BotConfig;

try {
  config = loadConfig();
} catch (error) {
  console.error("An error occurred while initializing configuration:", error);
  process.exit(1);
}

// Print a fancy header banner when starting up.
console.log("======================================");
console.log("         HASS BOT FOR DISCORD         ");
console.log("======================================");
// Print the configuration object
console.log("Configuration:");
// Tokens and passwords are masked by default for security, you can comment
// those lines if you want to see them.
console.debug({
  ...config,
  bot: { ...config.bot, token: '***' },
  mqtt: { ...config.mqtt, password: '***' }
});

// Create the clients.
const discordClient: Client = createDiscordClient();
const mqttClient: MqttClient = createMqttClient(config, discordClient);

// Bind handlers to listeners.
mqttClient.on("connect", CreateHandleMqttReady(mqttClient, discordClient, config));
mqttClient.on("error", handleMqttError);
mqttClient.on("close", handleMqttDisconnect);
mqttClient.on("message", createHandleMqttMessage(mqttClient, discordClient, config));
discordClient.on("ready", createHandleDiscordReady(discordClient, mqttClient, config));
discordClient.on("voiceStateUpdate", createHandleVoiceStatusUpdate( mqttClient, config));
discordClient.on("presenceUpdate", createHandlePresenceUpdate(discordClient, mqttClient, config));

// Connect to Discord.
discordClient.login(config.bot.token);
