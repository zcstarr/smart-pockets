###############################
Introduction to Pockets 
###############################

.. _basic-pocket-service:

***********************
A Basic Subscription Service 
***********************

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
            pocketAddress = pocketsHub.newPocket();
            userRegistry[msg.sender] = pocketAddress;
            Pocket pocket = Pocket(pocketAddress);
            pocket.registerService(plan);
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

        function newUser(bytes plan)
          public
        {
            pocketAddress = pocketsHub.newPocket();
            Pocket pocket = Pocket(pocketAddress);
            pocket.registerService(plan);
        }

    }
    
The first line of code;