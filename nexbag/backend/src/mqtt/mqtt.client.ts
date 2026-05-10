import mqtt, { MqttClient } from 'mqtt';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { TOPICS } from './topics';

let client: MqttClient;

// ─── Initialize MQTT client singleton ─────────────────────────────────────────
// Per AI_Instructions.md §9: reconnectPeriod 5000ms
export async function initMqttClient(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const options: mqtt.IClientOptions = {
      clientId: env.MQTT_CLIENT_ID,
      reconnectPeriod: 5000,          // Auto-reconnect every 5s
      connectTimeout: 10_000,
      keepalive: 30,
      clean: true,
      ...(env.MQTT_USERNAME ? { username: env.MQTT_USERNAME } : {}),
      ...(env.MQTT_PASSWORD ? { password: env.MQTT_PASSWORD } : {}),
    };

    client = mqtt.connect(env.MQTT_BROKER_URL, options);

    client.on('connect', () => {
      logger.info(`MQTT connected to ${env.MQTT_BROKER_URL}`);

      // Subscribe to all device topics
      client.subscribe(TOPICS.ALL, { qos: 0 }, (err) => {
        if (err) {
          logger.error('MQTT subscribe failed', { err });
          reject(err);
        } else {
          logger.info(`MQTT subscribed to ${TOPICS.ALL}`);
          resolve(client);
        }
      });
    });

    client.on('reconnect', () => {
      logger.warn('MQTT reconnecting...');
    });

    client.on('disconnect', () => {
      logger.warn('MQTT disconnected');
    });

    client.on('error', (err) => {
      logger.error('MQTT error', { err });
      // Don't reject after initial connection — reconnect handles it
    });

    client.on('message', async (topic, message) => {
      // Route to handler — imported lazily to avoid circular deps
      const { handleMqttMessage } = await import('./mqtt.handler');
      await handleMqttMessage(topic, message);
    });

    // Reject if initial connection times out
    setTimeout(() => {
      if (!client.connected) {
        logger.warn('MQTT initial connection timeout — will retry in background');
        resolve(client); // Resolve anyway; reconnect will handle it
      }
    }, 15_000);
  });
}

// Export the singleton client for publishing
export { client as mqttClient };
