const {expect} = require('chai');
const assertJump = (error) => {
assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
};

const checkInvalidOp = async (asyncOp) => {
  let invalidOp = false;
  try {
    await asyncOp();
  } catch (e) {
    assertJump(e);
    invalidOp = true;
  }
  expect(invalidOp).to.eq(true);
};

const advanceBlock = () => {
  return new Promise((resolve, error) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: 12345
    }, (err, result) => {
      if (err) {
        return error(err);
      }
      resolve(result)
    });

  });
};

module.exports = {
  assertJump,
  checkInvalidOp,
  advanceBlock,
}