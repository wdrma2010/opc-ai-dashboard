function getRequiredEnv(name, validator, defaultValue = "") {
  let value = process.env[name];

  if (value) {
    if (!validator(value)) {
      throw new Error(`Invalid env variable ${name}: ${value}`);
    }
    return value;
  }

  if (defaultValue) {
    if (!validator(defaultValue)) {
      throw new Error(`Default value invalid for ${name}: ${defaultValue}`);
    }
    return defaultValue;
  }

  throw new Error(`Missing required env variable: ${name}`);
}

module.exports = {
  getRequiredEnv,
  CONNECTION_CONFIG: { timeout: 5000, keepAlive: true, keepAliveInitialDelay: 10000, noDelay: true },
};
