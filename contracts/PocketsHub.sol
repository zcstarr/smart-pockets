pragma solidity ^0.4.17;
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './Registry.sol';
import './Service.sol';
import './Pockets.sol';


contract PocketsHub is Ownable {
    uint constant VERSION = 1 ;
    Registry public trustedRegistry;

    event LogNewPocket (
      address owner,
      address pocket,
      address registry,
      uint version
    );
 
    event LogNewService(
      address owner,
      address service,
      address registry,
      uint version
    );

    function newPocket() 
        public 
        returns(Pockets)
    {
        Pockets trustedPocket = new Pockets(msg.sender, trustedRegistry);
        trustedRegistry.registerPocket(trustedPocket,msg.sender,VERSION);
        LogNewPocket(
            msg.sender, 
            trustedPocket, 
            trustedRegistry, 
            VERSION
        );
        return trustedPocket;
    }
 
    function newService() 
        public 
        returns(Service)
    {
        Service trustedService = new Service(msg.sender, trustedRegistry);
        trustedRegistry.registerService(trustedService,msg.sender, VERSION);
        LogNewService(
            msg.sender, 
            trustedService, 
            trustedRegistry, 
            VERSION
        );
        return trustedService;
    }

    function setAvgBlockTime(uint256 avgBlockTime)
        onlyOwner
        public
    {
        trustedRegistry.setAvgBlockTime(avgBlockTime);
    }

    function PocketsHub(uint256 avgBlockTime) {
        trustedRegistry = new Registry(this, avgBlockTime);    
    }
   
}