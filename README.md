# Pockets


Pockets is a library for writing reoccurring payment [Smart Contracts](https://en.wikipedia.org/wiki/Smart_contract) on Ethereum.


## Getting Started
Install truffle
```sh
npm install -g truffle
mkdir yourproject && cd yourproject
truffle init
```

To install the Pockets library, run:
```sh
npm init
npm install smart-pockets
```

or yarn

```
yarn init
yarn add smart-pockets
```

After that, you'll get the library's contracts in the `node_modules/smart-pockets/contracts` folder. You can use the contracts in the library like so:

```js
import 'smart-pockets/contracts/PocketsHub';

contract SubscriptionHub is PocketsHub {
  ...
}
```

## Developer Resources

- Read documentation: pockets.readthedocs.io/en/latest/

Interested in contributing to Pockets?

https://github.com/Pockets/smart-pockets/blob/master/CONTRIBUTING.md

## License
Code released under the [MIT License](https://github.com/Pockets/smart-pockets/blob/master/LICENSE).



```
start a private network unless you have one 

geth --datadir ~/.ethereum/net43

GETH_IPC='~/.ethereum/net43/geth.ipc'
geth --networkid 42 --datadir ~/.ethereum/net42 console
or 
testrpc 
truffle migrate --reset 
let hub;
let service;
let registry;
let pocket;

PocketsHub.deployed().then((i)=> hub = i);
hub.trustedRegistry.call().then((address) => {registry = Registry.at(address)});
hub.newService().then((tx)=> { service = Service.at(tx.logs[0].args.service)})
registry.registerPlan(service.address,web3.toWei(0.01,'ether'),34000,0,true,'CoolPlan')
hub.newPocket({from: web3.eth.accounts[1]}).then((tx)=>pocket = Pockets.at(tx.logs[0].args.pocket));
web3.eth.sendTransaction({from: web3.eth.accounts[3], value: web3.toWei(5,'ether') , to:pocket.address})
//TO advance time
web3.currentProvider.sendAsync({jsonrpc: '2.0', method:'evm_mine', id:12345},(err,result)=>{})
```

node app/server.js --hub 0x345ca3e014aaf5dca488057592ee47305d9b3e10 --service 0xaa8f61728cb614f37a2fdb8b420c3c33134c7f69