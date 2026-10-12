require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const readline = require('node:readline/promises');
const User = require('../models/User');

const ask = async (question) => {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return (await terminal.question(question)).trim();
  } finally {
    terminal.close();
  }
};

const askHidden = (question) => new Promise((resolve, reject) => {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    reject(new Error('Run this command in an interactive terminal to enter the password securely.'));
    return;
  }

  let value = '';
  process.stdout.write(question);
  input.setEncoding('utf8');
  input.setRawMode(true);
  input.resume();

  const restoreTerminal = () => {
    input.removeListener('data', handleInput);
    input.setRawMode(false);
    process.stdout.write('\n');
  };

  const handleInput = (character) => {
    if (character === '\u0003') {
      restoreTerminal();
      reject(new Error('Cancelled.'));
      return;
    }
    if (character === '\r' || character === '\n') {
      restoreTerminal();
      resolve(value);
      return;
    }
    if (character === '\u007f' || character === '\b') {
      value = value.slice(0, -1);
      return;
    }
    if (character >= ' ' && character !== '\u007f') {
      value += character;
    }
  };

  input.on('data', handleInput);
});

const createHod = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Set it in server/.env before running this command.');
  }

  const name = await ask('HOD full name: ');
  const email = (await ask('HOD email: ')).toLowerCase();
  const department = await ask('Department: ');
  const mobile = await ask('Mobile (10 digits): ');
  const password = await askHidden('Password (minimum 8 characters): ');
  const passwordConfirmation = await askHidden('Confirm password: ');

  if (name.length < 3 || name.length > 100) {
    throw new Error('Name must be between 3 and 100 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  if (!department || department.length > 100) {
    throw new Error('Department is required and must be at most 100 characters.');
  }
  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('Mobile number must contain exactly 10 digits.');
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
  if (password !== passwordConfirmation) {
    throw new Error('Passwords do not match.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  if (await User.exists({ email })) {
    throw new Error('An account with that email already exists.');
  }

  await User.create({ name, email, password, role: 'hod', department, mobile });
  console.log(`HOD account created for ${email}. You can now sign in using the HOD option.`);
};

createHod()
  .catch((error) => {
    console.error(`Could not create HOD account: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
