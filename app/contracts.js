const Web3 = require('web3');
const TestRPC = require('ethereumjs-testrpc');
const truffleContractFactory = require('truffle-contract');


const PocketsJson = require('../build/contracts/Pockets.json');
const PocketsHubJson = require('../build/contracts/PocketsHub.json');
const RegistryJson = require('../build/contracts/Registry.json');
const ServiceJson = require('../build/contracts/Service.json');
const MigrationsJson = require('../build/contracts/Migrations.json');

const Pockets = truffleContractFactory(PocketsJson);
const Service = truffleContractFactory(ServiceJson);
const PocketsHub = truffleContractFactory(PocketsHubJson);
const Registry = truffleContractFactory(RegistryJson);
const Migrations = truffleContractFactory(MigrationsJson);
let web3;
let provider;

const geth_ipc = process.env['GETH_IPC'];
// /.ethereum/net42/geth.ipc
if (!geth_ipc && !web3){
  provider = new Web3.providers.HttpProvider('http://localhost:9545');
  web3 = new Web3(provider);
}
else
  web3 = new Web3(new Web3.providers.IpcProvider(
    process.env['HOME'] + `${geth_ipc}`,
    require('net')));

web3.eth.getAccountsPromise = () =>
  new Promise((resolve, reject) =>
    web3.eth.getAccounts((error, accounts) =>
      error ? reject(error) : resolve(accounts)));

[Pockets, Service, PocketsHub, Registry, Migrations]
  .forEach(contract => contract.setProvider(provider));

module.exports = {
  web3,
  Pockets,
  PocketsHub,
  Registry,
  Service,
  Migrations,
};
