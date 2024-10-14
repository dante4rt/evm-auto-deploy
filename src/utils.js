require('colors');
const fs = require('fs');
const readlineSync = require('readline-sync');

function loadNetworkConfig(networkType) {
  const filePath = `./chains/${networkType}.json`;
  try {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error loading network configuration: ${error.message}`.red);
    process.exit(1);
  }
}

function getUserInput() {
  const name = readlineSync.question('Enter token name: '.cyan);
  const symbol = readlineSync.question('Enter token symbol: '.cyan);
  const supply = readlineSync.question('Enter token supply: '.cyan);
  return { name, symbol, supply };
}

function displayHeader() {
  process.stdout.write('\x1Bc');
  console.log('========================================'.rainbow);
  console.log('=       🚀🎮 EVM Auto Deploy 🎮🚀      ='.cyan.bold);
  console.log('=    Created by HappyCuanAirdrop 🧙‍♂️   ='.magenta);
  console.log('=   https://t.me/HappyCuanAirdrop 🌐   ='.blue);
  console.log('========================================'.rainbow);
  console.log();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { loadNetworkConfig, getUserInput, displayHeader, delay };
