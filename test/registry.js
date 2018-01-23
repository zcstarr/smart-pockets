const Registry = artifacts.require("./Registry.sol");
const chai = require('chai');
const {expect} = chai;

contract('Registry', function(accounts) {

  beforeEach(async () => {
    testAddress = '0x00000001';
    registry = await Registry.new(accounts[0],17);
  });


  it("should register a service", async () => {
    await registry.registerService(testAddress, accounts[0], 1);
    serviceEntry = await registry.getService(testAddress)
    expect(serviceEntry[1]).to.eq(accounts[0])
  });

  it('should register a Pocket', async () => {
    await registry.registerPocket(testAddress, accounts[0],1)
    pocketEntry = await registry.getPocket(testAddress)
    expect(pocketEntry[1]).to.eq(accounts[0]);
  });

  it('should register a plan', async () => {
    await registry.registerService(testAddress, accounts[0], 1);
    await registry.registerPlan(testAddress, 1000, 5000, 17000, true, 'testPlan');
    storedPlan= await registry.getPlan(testAddress, 'testPlan');
    expect(storedPlan[0].toString()).to.eq('1000');
    expect(storedPlan[1].toString()).to.eq('5000');
    expect(storedPlan[2].toString()).to.eq('17000');
    expect(storedPlan[3]).to.eq(true);
    expect(storedPlan[4]).to.eq(true);
  });

});