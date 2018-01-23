const PocketsHub = artifacts.require("./PocketsHub.sol");
const Pockets = artifacts.require('./Pockets.sol');

const chai = require('chai');
const {expect} = chai;

//DEFINING GAS price to fixed number for test purposes
const GAS_PRICE = new web3.BigNumber(100000000000);
const AVG_BLOCK_TIME = 17000;
const TEST_PAYMENT_FREQ = 5 * AVG_BLOCK_TIME;

contract('PocketsHub', function (accounts) {


  let pocketHubOwner;
  let pocketOwner;
  let serviceOwner;
  
  const testEvent = (event, verifier) => {
    return new Promise((resolve) => {
      event.watch((err, result) => {
        resolve(verifier(result));
      })
    });
  }

  beforeEach(async () => {
    pocketHubOwner = accounts[0];
    pocketOwner = accounts[1];
    serviceOwner = accounts[2]; 
    pocketsHub = await PocketsHub.new(17000, { from: pocketHubOwner });
  });

  it("should deploy pocket", async () => {
    const event = pocketsHub.LogNewPocket();
    const eventTested = testEvent(event, (r) => {
      expect(r.event).to.eq('LogNewPocket');
      expect(r.args.owner).to.eq(pocketOwner)
      expect(r.args.pocket).to.not.eq('0x0');
    });

    const {receipt } = await pocketsHub.newPocket({ from: pocketOwner });
    eventTested.then(() => event.stopWatching());
  });

 it("should deploy service", async () => {
    const event = pocketsHub.LogNewService();
    const eventTested = testEvent(event, (r) => {
      expect(r.event).to.eq('LogNewService');
      expect(r.args.owner).to.eq(serviceOwner)
      expect(r.args.service).to.not.eq('0x0');
    });

    const {receipt } = await pocketsHub.newService({ from: serviceOwner });
    eventTested.then(() => event.stopWatching());
  });
 
});
