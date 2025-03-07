module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7546, 
      network_id: "*",
      gas: 9000000, 
      gasPrice: 10000000000,
    },
  },
  compilers: {
    solc: {
      version: "0.8.28",
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "istanbul", 
      },
    },
  },
};
