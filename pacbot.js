const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const { Web3 } = require('web3');
require('dotenv').config();

// Initialize the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [
        Partials.Channel
    ]
});

// Initialize Web3
const web3 = new Web3(process.env.INFURA_URL);
const contractABI = require('./contractABI.json');

const CONTRACT_ADDRESS = '0x20DCA21798cbb0569E9082FCb0720F0453E7fCBf';
const ABI = contractABI;

const nftContract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

// Check if web3 is correctly initialized
if (!web3) {
    console.error('Failed to initialize Web3. Check your provider URL.');
    process.exit(1);
}

// Check if client is correctly initialized
if (!client) {
    console.error('Failed to initialize Discord client.');
    process.exit(1);
}

// Function to dynamically import node-fetch
async function fetchNftMetadata(tokenId) {
    const fetch = await import('node-fetch').then(mod => mod.default);
    try {
        // Fetch metadata from token URI
        const tokenUri = await nftContract.methods.tokenURI(tokenId).call();
        console.log(`Fetching metadata from: ${tokenUri}`);
        const response = await fetch(tokenUri);
        const metadata = await response.json();
        console.log(`Metadata fetched: ${JSON.stringify(metadata)}`);
        return metadata;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}

// Function to send mint message
function sendMintMessage(tokenId, to, metadata) {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID); // Replace with your channel ID
    if (channel && metadata) {
        // Create embed message
        const embed = new EmbedBuilder()
            .setTitle('New NFT Minted!')
            .setDescription(`Token ID: ${tokenId}\nTo: ${to}`)
            .setImage(metadata.image)
            .setTimestamp()
            .setFooter({ text: 'NFT Mint Bot', iconURL: client.user.avatarURL() });

        // Send embed message to channel
        channel.send({ embeds: [embed] });
    } else {
        console.error('Channel not found or metadata not available!');
    }
}

// Set up event listener for NFT minting
const eventEvents = () => {
    console.log('Listening Transfer events');
    const nftevent = nftContract.events.Transfer();
    nftevent
        .on('data', async event => {
            console.log(event);
            const tokenId = event.returnValues.tokenId;
            const to = event.returnValues.to;
            console.log(`New NFT minted! Token ID: ${tokenId} To: ${to}`);
            const metadata = await fetchNftMetadata(tokenId);
            sendMintMessage(tokenId, to, metadata);
        })
        // .on('error', error => {
        //     console.error('Error in event listener:', error);
        // });
}

// Set up event listener for client ready event
client.once('ready', () => {
    console.log('Bot is online!');
    // Check contract instance
    if (!nftContract) {
        console.error('Failed to create contract instance. Check your ABI and contract address.');
        return;
    }

    // Log available events
    console.log('Contract events:', nftContract.events);

    eventEvents();
});


client.login(process.env.DISCORD_TOKEN);