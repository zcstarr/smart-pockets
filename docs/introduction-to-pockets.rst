###############################
Introduction to Pockets 
###############################

.. _basic-pocket-service:

***********************
A Basic Subscription Service 
***********************

===================
Musicify Sample App
===================
Here's a basic example of a dapp that uses subscrptions. It deploy's its own PocketHub 
 and creates a service and subscription plan for users to signup for.

::

      contract MusicifyApp{

          PocketsHub public pocketsHub;
          Service service;
          address public owner;
          //user address to pocket address
          mapping (address => address) public userRegistrations;

          event LogNewUser (
            address owner,
            address pocket
          );

          function MusicifyApp()
            public 
          {
              owner = msg.sender;
              // Create a pocket hub 
              pocketsHub = new PocketsHub(17000);
              service = pocketsHub.newService();
              pocketsHub.trustedRegistry.registerPlan(
                  service, 
                  1 ether, // payment 
                  34000, // payment freq in ms 
                  0,  // initial deposit 
                  true, // recurring payment 
                  "Basic Plan" // plan
                );
                pocketHub.transferOwnership(msg.sender);
          }
    
          function newUser(plan)
              public
          {
              pocketAddress = pocketsHub.newPocket();
              userRegistry[msg.sender] = pocketAddress;
              Pockets pocket = Pockets(pocketAddress);
              pocket.registerService();
              pocket.transferOwnership(msg.sender);
              LogNewUser(pocket.owner, pocket);
              return pocketAddress;
          }
      }    

=======================
Constructor Explanation
=======================

::  

      function MusicifyApp()
          public
      {
          // Create a pocket hub 
          pocketsHub = new PocketsHub(17000);
          ...
      }

The  constructor sets up a PocketsHub with an average
block time of 17ms. The PocketsHub is a factory contract, that generates Pocket and Service  
contracts. We set the average block time so that Pocket and Service contracts have the same concept 
of time. 


::  

      function MusicifyApp()
          public
      {
          ...
              service = pocketsHub.newService();
              pocketsHub.trustedRegistry.registerPlan(
                  service, 
                  1 ether, // payment 
                  34000, // payment freq in ms 
                  0,  // initial deposit 
                  true, // recurring payment 
                  "Basic Plan" // plan
                );
          ...
      }


After creating a PocketHub, the constructor uses the factory to create a Service, and then
uses the PocketHub's registry to register the plan to the service. Registering the plan with the 
service allows the pocket to trust that the plan will behave as the service provider specified.

::  

      pocketHub.transferOwnership(msg.sender);

Finally, at the end of the constructor we transfer ownership to the Application owner, 
for convenience. It is not necssary, but otherwise the owner of the hub is the Application code
which may require more thought for how the hub will be managed.

=======================
Generating a Pocket
=======================

::

      ...
          function newUser(plan)
              public
          {
              pocketAddress = pocketsHub.newPocket();
              Pockets pocket = Pockets(pocketAddress);
              pocket.registerService(service.address, plan);
              //Eujern note this might be problematic because of the registry
              pocket.transferOwnership(msg.sender);
              LogNewUser(pocket.owner, pocket);
              return pocketAddress;
          }
      }    

We use the PocketHub to first generate a Pocket for the user, we then register
the pocket for the plan the user has specified. Here we transition ownership in 
order to allow the user and not the contract to own the pocket. Giving the user
control of their funds.

========================
Musicify Sample Frontend 
========================

::

      // Import the page's CSS. Webpack will know what to do with it.
      import "../stylesheets/app.css";

      // Import libraries we need.
      import { default as Web3} from 'web3';
      import { default as contract } from 'truffle-contract'
      import {Pockets, PocketsHub, Service, MusicifyApp} from './contract.js'

      // The following code is simple to show off interacting with your contracts.
      // As your needs grow you will likely need to change its form and structure.
      // For application bootstrapping, check out window.addEventListener below.
      let accounts;
      let account;
      let musicApp;
      let musicService;
      let pocket;
      let pocketAddress;

      window.App = {
        start: async () => {
            var self = this;


            // Get the initial account balance so it can be displayed.
            web3.eth.getAccounts(function(err, accs) {
                ...
                accounts = accs;
                account = accounts[0];

                musicApp = await MusicifyApp.deployed();
                pocketAddress = await musicApp.getPocket.call();
                serviceAddress = await musicApp.service.call();
                service = await Service.at(serviceAddress);
                if (pocketAddress !== 0) {
                    pocket = await Pockets.at(pocketAddress);
                }

            });
        },

        subscribe: async () => {
            const event = pocketsHub.LogNewUser();
            event.watch((err, result) =>{
                pocketAddress = result.args.address;
            });
            if(pocketAddress === 0 )
                await musicApp.addUser.call();
            console.error('User address already registered');
        },

        getMusicifyBalance: async () => {
                pocket.getPocketBalance(serviceAddress);
        },

        addToMusicifyBalance: async (value) => {
            if(pocketAddress !== 0)
                 await web3.eth.sendTransaction({ to: pocketAddress, from: account, value: web3.toWei(value, 'ether') })
            console.error('Could not execute transaction without a pocket address');
        },
    }
In this example we use webpack and web3 to instantiate our MusicifyApp, the 
interface provides hooks that allow a potential user to subscribe to our service and 
for the same user to check the currentBalance or add to the balance of their account


PocketsHub Composition Pattern
==============================

::

    pragma solidity ^0.4.17;
    import 'smart-pockets/contracts/PocketsHub.sol';

    contract SubscriptionService {  

        PocketsHub public pocketsHub;
        address public owner;
        mapping (address => address) public userRegistrations;

        function SubscriptionService()
          public 
        {
            owner = msg.sender;
            pocketsHub = new PocketsHub(17000);
            service = pocketsHub.newService(msg.sender,pocket);
             pocketsHub.trustedRegistry.registerPlan('Gold');
            pocketsHub.trustedRegistry.registerPlan('Silver');
            pocketsHub.trustedRegistry.registerPlan('Bronze');
        }

        function newUser(bytes plan)
          public
        {
            //The owner of the pocket is the Service not the user
            pocketAddress = pocketsHub.newPocket();
        }

    }
   

PocketsHub Inheritance Pattern 
==============================
::

    pragma solidity ^0.4.17;
    import 'smart-pockets/contracts/PocketsHub.sol';

    contract SubscriptionService is PocketsHub{  

        function SubscriptionService()
          public 
        {
            super();
            service = newService(msg.sender,pocket);
            trustedRegistry.registerPlan('Gold');
            trustedRegistry.registerPlan('Silver');
            trustedRegistry.registerPlan('Bronze');
        }

        function newUser()
          public
        {
            //The owner of the pocket is the user
            newPocket();
        }
    }
    
The first line of code;