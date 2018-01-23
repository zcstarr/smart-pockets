const Pockets = artifacts.require("./Pockets.sol");
const Registry = artifacts.require("./Registry.sol");
const chai = require('chai');
const {expect} = chai;
const { advanceBlock, assertJump, checkInvalidOp } = require('./utils');

//DEFINING GAS price to fixed number for test purposes
const GAS_PRICE = new web3.BigNumber(100000000000);
const AVG_BLOCK_TIME = 17000;
const TEST_PAYMENT_FREQ = 5 * AVG_BLOCK_TIME; 

const verifyPocketResults = (actualPocket, expectedPocket) => {
  expect(actualPocket.balance.toString()).to.eq(expectedPocket.balance)
  expect(actualPocket.active).to.eq(expectedPocket.active)
  expect(actualPocket.subscription).to.eq(expectedPocket.subscription)
  expect(actualPocket.paymentDeadline.toString()).to.eq(expectedPocket.paymentDeadline)
  expect(actualPocket.paymentAmount.toString()).to.eq(expectedPocket.paymentAmount)
  expect(actualPocket.paymentFreq.toString()).to.eq(expectedPocket.paymentFreq)
}
  // TODO add event logging 
  const getNextDeadline = (paymentFreq) => {
    return Math.floor(paymentFreq / AVG_BLOCK_TIME) + web3.eth.blockNumber;
  }

  const convertToPocket = (pocketStatus) =>{
    const mapping = ['balance','active','subscription','paymentAmount','paymentDeadline','paymentFreq'];
    const pocket = {}
    pocketStatus.forEach( (x,idx)=>{
      pocket[mapping[idx]]=x;
    })
    return pocket;
  }
  
contract('Pockets', function(accounts) {

  let registry; 
  let pocket;
  let testAddress;
 
  const registerTestAddress = (owner, provider, payment = 100, initialDeposit = 0, freq = TEST_PAYMENT_FREQ, subscription = true) => (
    pocket.registerAddress(provider, payment, freq, initialDeposit, subscription, { from: owner })
  );


  beforeEach(async () => {
    registry = await Registry.new(accounts[0],AVG_BLOCK_TIME);
    pocket = await Pockets.new(accounts[0], registry.address);
    await web3.eth.sendTransaction({ to: pocket.address, from: accounts[2], value: web3.toWei('1', 'ether') })
    // start the contract off with 1000 wei balance
  });

  it("should have 1 eth available in the pocket", async () => {
    let bal = await web3.eth.getBalance(pocket.address);
    expect(bal.toString()).to.eq(web3.toWei(1,'ether').toString());
    const availableBalance = await pocket.getAvailableBalance();
    expect(availableBalance.toString()).to.eq(web3.toWei(1,'ether').toString());
  });
 
  it("should register an address without initial deposit", async() => {

    const availableBalance = await pocket.getAvailableBalance.call();
    let result = await pocket.registerAddress(accounts[1], 50, TEST_PAYMENT_FREQ, 0, true, { from: accounts[0] });

    const newAvailableBalance = await pocket.getAvailableBalance.call();
    expect(newAvailableBalance.sub(availableBalance).toString()).to.eq('0');

    let pocketStatus = await pocket.getPocket.call(accounts[1], {from: accounts[0]});
    const p = convertToPocket(pocketStatus);
    const expected= {
      balance: '0',
      active: true,
      subscription: true,
      paymentDeadline: '0',
      paymentAmount: '50',
      paymentFreq: `${TEST_PAYMENT_FREQ}`,
    };
    verifyPocketResults(p, expected);
  });
  
  it("should register an address with initial deposit", async() => {

    const availableBalance = await pocket.getAvailableBalance.call();
    let result = await pocket.registerAddress(accounts[1], 50, TEST_PAYMENT_FREQ, 10, true, { from: accounts[0] });
    const deadline = getNextDeadline(TEST_PAYMENT_FREQ);
    const newAvailableBalance = await pocket.getAvailableBalance.call();
    expect(newAvailableBalance.sub(availableBalance).toString()).to.eq('-10');

    let pocketStatus = await pocket.getPocket.call(accounts[1], {from: accounts[0]});
    const p = convertToPocket(pocketStatus);
    const expected = {
      balance: '10',
      active: true,
      subscription: true,
      paymentDeadline: `${deadline}`,
      paymentAmount: '50',
      paymentFreq: `${TEST_PAYMENT_FREQ}`,
    };
    verifyPocketResults(p, expected);

  });

  it("should not allow registration with initial deposit if balance not available", async () => {
    checkInvalidOp(() => (registerTestAddress(accounts[0], accounts[1], web3.toWei(20, 'ether'), web3.toWei(20, 'ether'))));
  });

  it("should prevent overdrawn balance", async () => {
    await registerTestAddress(accounts[0], accounts[1], web3.toWei(1, 'ether'));
    await pocket.hold({ from: accounts[1] });
    for (let i = 0; i < 5; i++)
      await advanceBlock();
    const balance = await web3.eth.getBalance(pocket.address);
    const availableBalance = await pocket.getAvailableBalance.call();
    checkInvalidOp(() => (pocket.hold({ from: accounts[1] })));
  })

  it("should allocate funds to pocket when requested", async () => {

    const availableBalance = await pocket.getAvailableBalance.call();
    await registerTestAddress(accounts[0], accounts[1], 100, 0);

    await pocket.hold({ from: accounts[1] });
    const deadline = getNextDeadline(TEST_PAYMENT_FREQ);

    const newAvailableBalance = await pocket.getAvailableBalance.call();

    expect(newAvailableBalance.sub(availableBalance).toString()).to.eq('-100');

    let pocketStatus = await pocket.getPocket.call(accounts[1], { from: accounts[0] });
    const p = convertToPocket(pocketStatus);
    const expected = {
      balance: '100',
      active: true,
      subscription: true,
      paymentDeadline: `${deadline.toString()}`,
      paymentAmount: '100',
      paymentFreq: `${TEST_PAYMENT_FREQ}`,
    };
    verifyPocketResults(p, expected);
  });

  it("should only allocate funds when the deadline passes", async () => {
    const availableBalance = await pocket.getAvailableBalance.call(); 
    await registerTestAddress(accounts[0], accounts[1], 100, 0);

    await pocket.hold({from: accounts[1]});
    let pocketStatus = await pocket.getPocket.call(accounts[1], {from: accounts[0]});
    const p = convertToPocket(pocketStatus);

    await checkInvalidOp(() => (pocket.hold({ from: accounts[1] })));
    // Advance block beyond deadline
    for (let i = 0; i < 5; i++)
      await advanceBlock();
    
    await pocket.hold({from: accounts[1]});
  });

  it("should allow funds to be withdrawn only by the provider", async () => {
    await registerTestAddress(accounts[0], accounts[1], web3.toWei(0.5, 'ether'));
    await pocket.hold({ from: accounts[1] });
    checkInvalidOp(() => (pocket.withdraw(web3.toWei(0.5, 'ether'), { from: accounts[4] })));
  });

  it("should allow funds to be withdrawn by the provider", async() => {
    await registerTestAddress(accounts[0], accounts[1], web3.toWei(0.5,'ether'));
    await pocket.hold({from: accounts[1]});

    const oldBalance = await web3.eth.getBalance(accounts[1]);
    const availableBalance = await pocket.getAvailableBalance.call(); 
    const {receipt} = await pocket.withdraw(web3.toWei(0.5,'ether'), {from: accounts[1]});
    const gasCost = GAS_PRICE.mul(receipt.gasUsed);
    const newBalance = await web3.eth.getBalance(accounts[1]);
    const balanceIncrease = web3.fromWei(newBalance.sub(oldBalance),'ether').add(web3.fromWei(gasCost,'ether'));
    expect(new web3.BigNumber(0.5).sub(balanceIncrease).toString()).to.eq('0');
   
  });

  it("should allow funds to be added to contract", async() =>{
    await registerTestAddress(accounts[0], accounts[1], web3.toWei(1,'ether'));
    const contractBalance = await pocket.getAvailableBalance.call();

    await pocket.deposit(web3.toWei(1,'ether'), accounts[1], {from: accounts[0]});
    const pocketBalance = await pocket.getPocketBalance.call(accounts[1]);

    const newContractBalance = await pocket.getAvailableBalance.call();

    expect(contractBalance.sub(web3.toWei(1,'ether')).toString()).to.eq(newContractBalance.toString())
    expect(pocketBalance.toString()).to.eq(web3.toWei(1,'ether'));
  })

  it("should allow funds to be refunded when placed on hold", async() => {

    await registerTestAddress(accounts[0], accounts[1], web3.toWei(1,'ether'));
    const balance = await pocket.getAvailableBalance();

    await pocket.hold({from: accounts[1]});
    const balance1 = await pocket.getAvailableBalance();

    // Only owner should be able to refund
    checkInvalidOp(() => (pocket.refund(web3.toWei(5, 'ether'), { from: accounts[4] })));

    expect(balance.toString()).to.eq(balance1.add(web3.toWei(1,'ether')).toString());
    await pocket.refund(web3.toWei(1,'ether'), {from: accounts[1]});

    const balance2 = await pocket.getAvailableBalance();
    expect(balance.toString()).to.eq(balance2.toString())

  });


  it("should allow owner to withdraw funds from contract", async() => {
     const balance = await pocket.getAvailableBalance();
     const acctBalance =web3.eth.getBalance(accounts[0]);

     // Only owner shoululd be able to withdraw
     await checkInvalidOp(() => (pocket.withdrawFromContract(balance, { from: accounts[4] })));
     const { receipt } = await pocket.withdrawFromContract(balance, { from: accounts[0] })

     const gasCost = GAS_PRICE.mul(receipt.gasUsed);
     expect(acctBalance.add(balance).sub(gasCost).toString()).to.eq(web3.eth.getBalance(accounts[0]).toString())

     const finalBalance = await pocket.getAvailableBalance();
     expect(finalBalance.toString()).to.eq('0');
  })
  
  it("should only allow owner to cancel pocket", async () => {
    await registerTestAddress(accounts[0], accounts[1], web3.toWei(5, 'ether'));
    checkInvalidOp(() => (pocket.cancel(accounts[1], { from: accounts[4] })));
  });

  it("should allow owner to cancel pocket", async () => {
     const pocketBalanceBefore = await pocket.getAvailableBalance();
     await registerTestAddress(accounts[0], accounts[1], web3.toWei(1,'ether'));
     const acctBalanceBefore = web3.eth.getBalance(accounts[1]);
     const {receipt} = await pocket.cancel(accounts[1],{from: accounts[0]})
     const gasCost = GAS_PRICE.mul(receipt.gasUsed);
     const pocketBalanceAfter = await pocket.getAvailableBalance.call();
     const acctBalanceAfter = web3.eth.getBalance(accounts[1]);

     expect(pocketBalanceBefore.sub(pocketBalanceAfter).toString()).to.eq(web3.toWei(1,'ether').toString());
     expect(acctBalanceBefore.add(web3.toWei(1,'ether')).toString()).to.eq(web3.eth.getBalance(accounts[1]).toString())
  })

  it("should allow an owner to self destruct the contract", async () =>{
     const pocketBalanceBefore = await pocket.getAvailableBalance();
     await registerTestAddress(accounts[0], accounts[1], web3.toWei(1,'ether'));
     const acctBalanceBefore = web3.eth.getBalance(accounts[1]);
     const {receipt} = await pocket.kill();
     const gasCost = GAS_PRICE.mul(receipt.gasUsed);
     const pocketBalanceAfter = await pocket.getAvailableBalance.call();
     const acctBalanceAfter = web3.eth.getBalance(accounts[1]);

     expect(pocketBalanceBefore.sub(pocketBalanceAfter).toString()).to.eq(web3.toWei(1,'ether').toString());
     expect(acctBalanceBefore.add(web3.toWei(1,'ether')).toString())
  });
 
});