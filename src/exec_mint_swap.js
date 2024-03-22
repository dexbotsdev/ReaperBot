const {
    Liquidity,
    TokenAmount,
    jsonInfo2PoolKeys,
    buildSimpleTransaction
} = require('@raydium-io/raydium-sdk');
const spl = require("@solana/spl-token");
const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createMintToInstruction } = spl;
const {
    PublicKey,Transaction,ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL
} = require("@solana/web3.js");

 

const bs58 = require('bs58') 
const {
    connection,
    makeTxVersion,
    addLookupTableInfo
} = require('../config.js')

const {
    getWalletTokenAccount,
    formatAmmKeysById,
    sleepTime
} = require('./util.js')

async function execMintNSwap(input) {
    const myKeyPair =  input.wallet;
    const myPublicKey = myKeyPair.publicKey

    // -------- pre-action: get pool info --------
    // const targetPoolInfo = await formatAmmKeysById(input.targetPool)
    let targetPoolInfo;
    while (true) {
        try {
            targetPoolInfo = await formatAmmKeysById(input.targetPool);
            if (targetPoolInfo) {
                break; // If successful, exit the loop
            }
        } catch (error) {
            console.error('pool not found, retrying...');
        }
        await sleepTime(1000); // Wait for 1 seconds before retrying
    }
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo)

    // -------- step 1: coumpute amount out --------
    // const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    //     poolKeys: poolKeys,
    //     poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    //     amountIn: input.inputTokenAmount,
    //     currencyOut: input.outputToken,
    //     slippage: input.slippage,
    // })

    // hard_coded
    const minAmountOut = new TokenAmount(input.outputToken, 1)

    const walletTokenAccounts = await getWalletTokenAccount(connection, myPublicKey)

    const {innerTransactions} = await Liquidity.makeSwapInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
            tokenAccounts: walletTokenAccounts,
            owner: myPublicKey
        },
        amountIn: input.inputTokenAmount,
        amountOut: minAmountOut,
        fixedSide: 'in',
        makeTxVersion,
    })
     const _tempMintA = poolKeys.baseMint
    const _owner = myPublicKey
    const _toATA = await spl.getAssociatedTokenAddress(_tempMintA,_owner); 
    let minto =  createMintToInstruction( _tempMintA, _toATA, _owner, input.inputTokenAmount.raw);

    const SEND_AMT = 0.0001 * LAMPORTS_PER_SOL;
    const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: SEND_AMT });
    
    const transaction = new Transaction().add(PRIORITY_FEE_IX); 
 
    transaction.add(minto)
    innerTransactions.forEach(inst => {

      inst.instructions.forEach(i => {

        transaction.add(i)

      })
    })

    const latestBlockHash = await connection.getLatestBlockhash()

    transaction.recentBlockhash = latestBlockHash.blockhash
    transaction.lastValidBlockHeight = latestBlockHash.lastValidBlockHeight
    transaction.feePayer = myKeyPair.publicKey
    transaction.sign(myKeyPair)

    try{

      const signature = await connection.sendRawTransaction(transaction.serialize(), {skipPreflight : true, maxRetries : 5})

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature
      })
  
      console.log(`Transaction sent with signature: ${signature}`)
      console.log("swapped for " + myPublicKey)
      console.log("txids : "+ signature)


    }catch(e){

      logger.error("Transaction failed",e)
    }
    
 }

 

module.exports = {
    execMintNSwap
}