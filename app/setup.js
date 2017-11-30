const { Tiny, web3, PocketsHub, Pockets, Service, Registry } = require('./contracts.js');
const chalk = require('chalk');
//Get deployed instance of the hub from testrpc
const sampleTestRPCSetup = async () => {
  let hub;
  let service;
  let registry;
  let pocket;

  let accounts = await web3.eth.getAccountsPromise();
  hub = await PocketsHub.deployed();
  owner = await hub.owner.call();

  //Get instance of the registery the hub created
  registryAddress = await hub.trustedRegistry.call();
  registry = Registry.at(registryAddress);
  console.log(chalk.green(`Setting up a sample pocket and service`));

  //Register and create a new service provider contract
  console.log(chalk.green(`\nCreating a new service with owner accounts[0] owner:${accounts[0]}`))
  let tx = await hub.newService({ from: accounts[0], gas: 2000000 });
  service = Service.at(tx.logs[0].args.service);
  console.log(chalk.yellow(`Service created at address:${service.address}\n`))

  // Register a plan for the service
  console.log(chalk.green('Registering a plan called CoolPlan for once every 2 blocks to pay out 0.01 eth'));
  await registry.registerPlan(service.address, web3.toWei(0.01, 'ether'), 34000, 0, true, 'CoolPlan', {from: accounts[0], gas: 2000000 })
  console.log(chalk.yellow(`Plan:CoolPlan registered with service:${service.address}\n`));

  // Register and create a new pocket contract
  console.log(chalk.green(`Creating a pocket with the accounts[1] owner:${accounts[1]}`));
  await hub.newPocket({ gas: 2000000, from: accounts[1] }).then((tx) => pocket = Pockets.at(tx.logs[0].args.pocket));

  console.log(chalk.yellow(`Pocket created at address:${pocket.address}\n`));
  // Deposit some ether into the pocket contract 
  console.log(chalk.green('Depositing 5 ether into the pocket\n'));
  await web3.eth.sendTransaction({ from: web3.eth.accounts[3], value: web3.toWei(5, 'ether'), to: pocket.address })

  console.log('Advance blocks using the following command in the truffle console:')
  const advanceCmd = `web3.currentProvider.sendAsync({jsonrpc: '2.0', method:'evm_mine', id:12345},(err,result)=>{})`;
  console.log(`${advanceCmd}\n`);
  
  // Convenience output corresponding server command for the service
  console.log('Start a sample server with the following command:')
  const cmdString = `node app/server.js --hub ${hub.address} --service ${service.address}`;
  console.log(chalk.bold(cmdString));
};

sampleTestRPCSetup();