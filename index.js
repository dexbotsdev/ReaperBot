const fs = require('fs');
const readline = require('readline');
const {say} = require('cfonts');

const { PublicKey } = require('@solana/web3.js')
const {
    Token,
    Percent,
    TokenAmount,
    TOKEN_PROGRAM_ID
} = require('@raydium-io/raydium-sdk')

const { createToken } = require('./src/create_token.js')
const { createMarket } = require('./src/create_market.js')
const { createPool } = require('./src/create_pool.js')
const { execMintNSwap } = require('./src/exec_mint_swap.js')

const {
    connection,
    myKeyPair,
    DEFAULT_TOKEN,
} = require('./config.js')

const {
    getWalletTokenAccount,
    sleepTime
} = require('./src/util.js')

const prompt = require('prompt-sync')({ sigint: true });
const BN = require('bn.js');
const { NATIVE_MINT } = require('@solana/spl-token');
const Logger = require("@ptkdev/logger");
const logger = new Logger();

require('dotenv').config({ path: `.env.${process.env.NETWORK}` })
console.clear()
say('SolPuller!', {
    font: 'tiny',
    align: 'center', 
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
    gradient:  ['green','red'],
    independentGradient: false,
  });

logger.warning("...Enter TOKEN METADATA...")
const symbol = prompt('... Enter Token Symbol (default: "SLP"): ') || 'SLP';
const tokenName = prompt('... Enter Token Name (default: "SolPULLER"): ') || 'SolPULLER';

const amount = Number(prompt('... Enter Token Total Supply(default: 10000000): ')) || 10000000;
const decimals = Number(prompt('... Enter Token Decimals(default: 9): ')) || 9;
const imagePath = prompt('... Enter Token Image name (default: image.png): ') || 'image.png';
 
 

const lotSize =   0.1;
const tickSize =  0.001;

logger.warning("...Enter POOl Configuration Data ...")
const addBaseAmountNumber = Number(prompt('... Enter Token Pool Supply(default: 9000000): ')) || 9000000;
const addQuoteAmountNumber = Number(prompt('... Enter Token Pool SOL amount (default: 0.1): ')) || 0.1;
const poolLockTime = Number(prompt('... Enter Token Pool Launch Time Delay (default: 0):(in Seconds) ')) || 0;
 
main()

async function main() {
    logger.warning("Creating Token...")
    const tokenInfo= {
        amount: amount,
        decimals: decimals,
         symbol: symbol,
         metadata:{uri:''},
        tokenName: tokenName,
        image:imagePath
    }

    const mintAddress = await createToken(tokenInfo)

    const baseToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(mintAddress), tokenInfo.decimals, tokenInfo.symbol, tokenInfo.tokenName)
    const quoteToken = DEFAULT_TOKEN.WSOL

    logger.warning("Creating Market...")
    const targetMarketId = await createMarket({
        baseToken,
        quoteToken,
        lotSize,
        tickSize,
        wallet: myKeyPair,
    })

    // create pool
    const addBaseAmount = new BN(addBaseAmountNumber * (10 ** tokenInfo.decimals)) // custom token
    const addQuoteAmount = new BN(addQuoteAmountNumber * (10 ** 9)) // WSOL

    const startTime = Math.floor(Date.now() / 1000) + poolLockTime * 60 * 60

    let walletTokenAccounts;
    let found = false;
    while (!found) {
        walletTokenAccounts = await getWalletTokenAccount(connection, myKeyPair.publicKey)
        walletTokenAccounts.forEach((tokenAccount) => {
            if (tokenAccount.accountInfo.mint.toString() == mintAddress) {
                found = true;
                return;
            }
        });

        if (!found) {
            logger.warning("checking new token in wallet...")
            await sleepTime(1000); // Wait for 1 seconds before retrying
        }
    }

    logger.warning("Creating Pool...")
    const targetPoolPubkey = await createPool({
        baseToken,
        quoteToken,
        addBaseAmount,
        addQuoteAmount,
        targetMarketId,
        startTime,
        walletTokenAccounts
    })

    // const targetPool = '9cAk6wsiehHoPyEwUJ9Vy8fpb5iHz5uCupgAMRKxVfbN' // replace pool id
    const targetPool = targetPoolPubkey.toString()

    logger.warning("Waiting for User Input for Volume Based Swaps...")

    const inputAmount = prompt(`... Enter Amount of Tokens to Mint and Swap (Default : ${amount})`) || amount;
    const inputTokenAmount = new TokenAmount(baseToken, inputAmount ,false)
    const slippage = new Percent(1, 100)

    const yn = prompt('... Enter Y to Mint and Swap All Tokens (default : Y) ') || 'Y';

    if(yn=='Y'){

        const res = await execMintNSwap({
            targetPool:targetPool,
            outputToken:quoteToken,
            inputTokenAmount:inputTokenAmount, 
            slippage: slippage,
            wallet:myKeyPair
        })


    }

    // read wallet private keys from file
   


}


