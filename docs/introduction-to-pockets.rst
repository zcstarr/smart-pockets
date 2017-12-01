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