# Pockets


Pockets is a library for writing reccurring payment [Smart Contracts](https://en.wikipedia.org/wiki/Smart_contract) on Ethereum.


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

- Sample Project: https://github.com/zcstarr/pockets-sample

## Project Overview

### Organization
- app/ - contains example application
  - setup.js - used to instantiate a pocket, registry, and service
	- server.js - a rest server that you can curl to access the service contract
    ```sh truffle develop 
          truffle migrate —reset 
          truffle console 
          Pockets.at(pocketAddress).then((pocket)=>pocket.registerService(serviceAddress, ‘CoolPlan’)); 
    ```
- contracts/ - contains the contracts for Pockets
  - Pocket.sol - The pocket contract that holds a users eth
  - Service.sol - The service contract that holds a service providers eth
  - Registry.sol - A shared registry that allows pockets and service providers to trust that they’re running the proper    smart contract code and have the same concept of time
  - PocketsHub.sol - The pocket and service factory to generate and deploy pocket and service contracts
- test/ - Unit and integration tests for the Pockets/Service/PocketHub and Registry

### Concepts
- PocketsHub is a factory contract that takes an average block time and an Owner. It also deploys a public Registry that shows all the pockets and services registered with this hub. It is used to deploy new Service Contracts and Pocket Contracts

- Registry is a contract that contains the registration for a Service, a service plan, and Pockets. This allows pockets and service providers to verify that they were produced by the hub and valid pocket/service contracts. Additionally it allows for service providers to communicate to pocket contracts what a subscription does.

- Pockets is a contract that a user uses to register for service, or allow users to withdraw from a pocket on a one-shot or recurring basis 

- Service is a contract that a user uses to create a service to pull or accept users to gain access to services on a one-shot or recurring basis.
### How's it work ?

The process works as follows
```js
//A PocketHub is deployed with an 'initial average block time of 17 seconds'
PocketsHub.deployed().then((i)=> hub = i);

//The pockets hub contract deploys a registry. The hub owns this registry
hub.trustedRegistry.call().then((address) => {registry = Registry.at(address)});

// A service provider creates a new service 
hub.newService().then((tx)=> { service = Service.at(tx.logs[0].args.service)})

// The service provider owner registers a new plan
// The arguments are (serviceAddress, amount, frequency, initialDeposit, recurring, ’name’)
registry.registerPlan(service.address,web3.toWei(0.01,'ether'),34000,0,true,'CoolPlan')

//A user creates a pocket
hub.newPocket({from: web3.eth.accounts[1]}).then((tx) => pocket = Pockets.at(tx.logs[0].args.pocket));

// A user sends money to the pocket 
web3.eth.sendTransaction({from: web3.eth.accounts[3], value: web3.toWei(5,'ether') , to:pocket.address}) 

// The user signs up for the service;
pocket.registerService(service.address, 'CoolPlan');

// The service provider periodically checks its subscribers to see who they should collect from
// The service just places a hold on the subscription amount
service.requestHold(pocket.address)

// The service withdraws some amount from the pocket 
service.withdraw(pocket.address, web3.toWei(0.005,'ether'));

```

### Up Next ?

Off chain state/payment channels 

ERC-20 Token support

### Wanna Help 
Please contribute! Just create a PR or file an issue. 

### Special Thanks
Shout out to [Eujern Lim](https://github.com/eujern) for the PRs and discussions

## License
Code released under the [MIT License](https://github.com/Pockets/smart-pockets/blob/master/LICENSE).
