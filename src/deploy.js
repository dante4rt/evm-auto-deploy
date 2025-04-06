require("colors");
const ethers = require("ethers");
const fs = require("fs");
const readlineSync = require("readline-sync");
const { generateContractCode } = require("./contractCode");
const { loadAddresses, displayHeader } = require("./utils");

async function distributeTokens(
  contractAddress,
  abi,
  network,
  distributionList,
  symbol
) {
  try {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    displayHeader();
    console.log("\n🚀 Starting Token Distribution".green.bold);
    console.log(`📌 Contract: ${contractAddress}`.cyan);
    console.log(`🌍 Network: ${network.name}\n`.cyan);

    let successCount = 0;
    const failedTransactions = [];

    for (const [index, { address, amount }] of distributionList.entries()) {
      try {
        console.log(
          `📤 Sending to ${address} (${index + 1}/${distributionList.length})`
            .yellow
        );
        console.log(
          `   Amount: ${ethers.formatUnits(amount, 18)} ${symbol || "tokens"}`
            .dim
        );
        const tx = await contract.transfer(address, amount, {
          gasLimit: 300000,
        });
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          successCount++;
          console.log("   ✅ Success".green);
          console.log(`   Tx Hash: ${network.explorer}/tx/${tx.hash}\n`.dim);
        } else {
          failedTransactions.push({ address, amount, txHash: tx.hash });
          console.log("   ❌ Failed".red);
          console.log(`   Tx Hash: ${network.explorer}/tx/${tx.hash}\n`.dim);
        }
      } catch (error) {
        failedTransactions.push({ address, amount, error: error.message });
        console.log("   ❌ Error:".red, error.message);
        console.log("   Skipping to next address...\n".yellow);
      }
    }

    console.log("\n📊 Distribution Summary:".bold);
    console.log(`✅ Successful: ${successCount}`.green);
    console.log(`❌ Failed: ${failedTransactions.length}`.red);

    if (failedTransactions.length > 0) {
      const failedData = failedTransactions
        .map(
          (tx) =>
            `${tx.address},${tx.amount}${tx.error ? `,Error: ${tx.error}` : ""}`
        )
        .join("\n");

      fs.writeFileSync(
        "failed_distributions.csv",
        "address,amount,error\n" + failedData
      );
      console.log(
        "\n⚠️  Failed transactions saved to failed_distributions.csv".yellow
      );
    }
  } catch (error) {
    console.error("\n🔥 Critical Distribution Error:".red.bold, error.message);
    process.exit(1);
  }
}

async function getDistributionDetails(addresses, symbol) {
  displayHeader();
  console.log("\n📝 Token Distribution Setup".green.bold);
  console.log(`📋 Found ${addresses.length} addresses in address.txt`.cyan);

  console.log("\n🔧 Distribution Options:".bold);
  console.log("1. Same amount for all addresses");
  console.log("2. Custom amount for each address");

  const option = readlineSync.question(
    "\nSelect distribution mode (1/2): ".cyan
  );

  if (option === "1") {
    const amount = readlineSync.question(
      `Enter amount to send to each address (${symbol}): `.cyan
    );
    return addresses.map((address) => ({ address, amount }));
  } else if (option === "2") {
    console.log("\n✏️  Enter amount for each address:".bold);
    return addresses.map((address) => {
      const amount = readlineSync.question(`${address}: `.cyan);
      return { address, amount };
    });
  }

  throw new Error("Invalid distribution option");
}

async function deployContract(network, name, symbol, supply) {
  try {
    displayHeader();
    console.log(`\n🚀 Deploying ${name} (${symbol}) Token`.green.bold);
    console.log(`🌍 Network: ${network.name}`.cyan);
    console.log(`💰 Total Supply: ${supply}\n`.cyan);

    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`👤 Deployer: ${wallet.address}`.dim);

    console.log("\n🔨 Compiling contract...".yellow);
    const { bytecode, abi } = generateContractCode(name, symbol, supply);

    console.log("\n⏳ Deploying contract...".yellow);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy();
    const deployReceipt = await contract.deploymentTransaction().wait();

    console.log("\n✅ Contract deployed successfully!".green.bold);
    console.log(`📌 Contract Address: ${contract.target}`.cyan);
    console.log(
      `🔗 Explorer: ${network.explorer}/address/${contract.target}`.blue
    );
    console.log(`⛽ Gas Used: ${deployReceipt.gasUsed.toString()}`.dim);

    const addresses = loadAddresses();

    if (addresses.length > 0) {
      console.log(
        `\n📋 Found ${addresses.length} addresses in address.txt`.yellow
      );

      const distributionList = await getDistributionDetails(addresses, symbol);

      console.log("\n📊 Distribution Summary:".bold);
      let totalToDistribute = 0;
      distributionList.forEach(({ address, amount }, index) => {
        console.log(`${index + 1}. ${address}: ${amount} ${symbol}`);
        totalToDistribute += parseFloat(amount);
      });
      console.log(
        `\n💵 Total to distribute: ${totalToDistribute} ${symbol}`.bold
      );

      const confirm = readlineSync.question(
        "\n⚠️  Confirm token distribution? (y/n): ".yellow
      );
      if (confirm.toLowerCase() === "y") {
        console.log("\nStarting distribution...".green.bold);

        const distributionListInWei = distributionList.map((item) => ({
          address: item.address,
          amount: ethers.parseUnits(item.amount.toString(), 18),
        }));

        await distributeTokens(
          contract.target,
          abi,
          network,
          distributionListInWei,
          symbol
        );
      } else {
        console.log("\nDistribution cancelled".yellow);
      }
    } else {
      console.log(
        "\nNo addresses found in address.txt, skipping distribution".yellow
      );
    }

    return {
      contractAddress: contract.target,
      explorerUrl: `${network.explorer}/address/${contract.target}`,
      abi: abi,
    };
  } catch (error) {
    console.error("\n❌ Deployment Error:".red.bold, error.message);

    if (error.code === "INSUFFICIENT_FUNDS") {
      console.log("ℹ️  Please check your deployer wallet balance".yellow);
    } else if (error.code === "NETWORK_ERROR") {
      console.log(
        "ℹ️  Please check your RPC URL and network connection".yellow
      );
    }

    process.exit(1);
  }
}

async function getDistributionDetails(addresses, symbol) {
  console.log("\n🔧 Distribution Options:".bold);
  console.log("1. Same amount for all addresses");
  console.log("2. Custom amount for each address");
  console.log("3. Skip distribution");

  const option = readlineSync.question(
    "\nSelect distribution mode (1/2/3): ".cyan
  );

  if (option === "3") {
    return [];
  }

  if (option === "1") {
    const amount = readlineSync.question(
      `Enter amount to send to each address (${symbol}): `.cyan
    );
    return addresses.map((address) => ({ address, amount }));
  }

  if (option === "2") {
    console.log("\n✏️  Enter amount for each address:".bold);
    return addresses.map((address) => {
      const amount = readlineSync.question(`${address}: `.cyan);
      return { address, amount };
    });
  }

  throw new Error("Invalid distribution option selected");
}

module.exports = { deployContract };
