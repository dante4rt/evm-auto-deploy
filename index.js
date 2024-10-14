require('dotenv').config();
require('colors');
const {
  loadNetworkConfig,
  getUserInput,
  displayHeader,
  delay,
} = require('./src/utils');
const { deployContract } = require('./src/deploy');
const readlineSync = require('readline-sync');

async function main() {
  displayHeader();
  console.log(`Please wait...\n`.yellow);

  await delay(3000);

  console.log('Welcome to EVM Auto Deploy!'.green.bold);

  const networkType = process.argv[2] || 'testnet';
  const networks = loadNetworkConfig(networkType);

  console.log(`Available networks:`.yellow);
  networks.forEach((network, index) => {
    console.log(`${index + 1}. ${network.name}`);
  });

  const networkIndex =
    parseInt(readlineSync.question('\nSelect a network (enter number): '.cyan)) -
    1;
  const selectedNetwork = networks[networkIndex];

  if (!selectedNetwork) {
    console.error('Invalid network selection'.red);
    process.exit(1);
  }

  const { name, symbol, supply } = getUserInput();

  const contractAddress = await deployContract(
    selectedNetwork,
    name,
    symbol,
    supply
  );

  console.log(`\nDeployment completed!`.green.bold);
  console.log(`Token Name: ${name}`);
  console.log(`Token Symbol: ${symbol}`);
  console.log(`Token Supply: ${supply}`);
  console.log(`Contract Address: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
