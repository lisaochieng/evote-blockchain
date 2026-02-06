import '@nomicfoundation/hardhat-ethers';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    ethers: typeof import('@nomicfoundation/hardhat-ethers/internal/hardhat-ethers').default;
  }
}