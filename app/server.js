const express = require('express');
const { PocketsHub, Pockets, Registry, Service, web3 } = require('./contracts');
const yargs = require('yargs');
const {argv} =  yargs;
const app = express()
const port = 3000

let accounts;
let service;
let hub;
let owner;
let registry;

yargs.option('verbose', {
  alias: 'v',
  default: false,
  describe: 'Super verbose mode',
});
 yargs
.usage('Usage: $0 --hub [address] --service [address]')
.demandOption(['hub','service'])
.argv;


const collectPayment = async (pocketAddress) => {
  console.log(pocketAddress);
  console.log(owner);
   let tx = await service.requestHold(pocketAddress, { from: owner });
   tx.logs[0].args
   return {gasUsed: tx.gasUsed, amountHeld:null};
}

const getPocketBalance = async (pocketAddress) =>{
  const pocket = await Pockets.at(pocketAddress);
  return await pocket.getPocketBalance.call(service.address);
}

app.get('/collect', async (request, response) => {
  console.log('collecting payments');
  const [pocketAddress] = await service.getPocketByIdx.call(0);
  let {gasUsed} = await collectPayment(pocketAddress);
  console.log(`used ${gasUsed}`);
  response.send({gasUsed})
})

// display all the pockets with their balance
app.get('/list', async (request, response) => {
  const [pocketAddress] = await service.getPocketByIdx.call(0);
  let balance = await getPocketBalance(pocketAddress)
  response.send({ address: pocketAddress, balance: web3.fromWei(balance, 'ether') }); 
});

app.listen(port, async (err) => {
    accounts = await web3.eth.getAccountsPromise();
    service = Service.at(argv.service);
    hub = PocketsHub.at(argv.hub);
    owner = await service.owner.call();
    debugger
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
  console.log('starting service with:');
  console.log(`hub:${hub.address}, ${service.address}:service, ${owner}:owner`);
})