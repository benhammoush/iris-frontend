// Generated from the compatible Iris Worker openapi.yaml. Do not edit manually.
export interface paths {
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getHealth'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/internal/refresh': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations['refreshSnapshot'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/ready': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getReadiness'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/assets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['listV1Assets'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/assets/{symbol}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1AssetBySymbol'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/assets/id/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1AssetById'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/assets/mint/{mint}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1AssetByMint'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/market': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1Market'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1Status'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/swaps': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['listV1Swaps'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/wallets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['listV1Wallets'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/wallets/{address}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV1Wallet'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/assets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * @deprecated
     * @description Returns up to 250 snapshot assets
     */
    get: operations['listV2Assets'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/assets/{symbol}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2AssetBySymbol'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/assets/id/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2AssetById'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/assets/mint/{mint}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2AssetByMint'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/market': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2Market'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2Status'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/swaps': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['listV2Swaps'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/wallets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['listV2Wallets'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v2/wallets/{address}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @deprecated */
    get: operations['getV2Wallet'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['listV3Assets'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetByMint'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/candles': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetCandles'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/distribution': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetDistribution'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/history': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetHistory'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/holders': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetHolders'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/onchain': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetOnchain'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/assets/mint/{mint}/transactions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3AssetTransactions'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/catalogs': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3Catalogs'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/defillama': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3DefiLlamaDashboard'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/me/account': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /** @description Irreversibly purge saved references and commit durable Firebase cleanup. Empty body and no query parameters. Firebase identity must be current and authenticated within five minutes; unverified email is allowed. A receipt may only repeat/read an already accepted lifecycle, never start deletion or extend expiry. Requires separately approved cleanup setup. */
    delete: operations['deletePrivateAccount'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/me/account/deletion': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Receipt-only status; never accepts Firebase credentials or exposes an identity. Empty body, no query parameters. Rate limited by IP and receipt. Receipt expiry does not cancel durable cleanup. */
    get: operations['getAccountDeletionStatus'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/me/watchlist': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Returns only the verified user's saved references; never fetches wallet balances or market providers. No query parameters or request body accepted. */
    get: operations['getPrivateWatchlist'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/me/watchlist/{kind}/{address}': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Case-sensitive Base58 public key decoding to exactly 32 bytes. */
        address: string;
        kind: 'asset' | 'wallet';
      };
      cookie?: never;
    };
    get?: never;
    /** @description Empty body only. Save one reference; duplicate saves preserve the original timestamp even at the 100-per-kind limit. Ownership always comes from the verified token. */
    put: operations['savePrivateWatchlistItem'];
    post?: never;
    /** @description Empty body only. Permanently remove the verified user's reference; already absent is also successful. */
    delete: operations['removePrivateWatchlistItem'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/network': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3Network'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3Status'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/swaps': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['listV3Swaps'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/transactions/recent': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['listV3RecentTransactions'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/wallets/{address}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3Wallet'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/wallets/{address}/events': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * @deprecated
     * @description Compatibility alias for `/v3/wallets/{address}/transactions`.
     */
    get: operations['getV3WalletEvents'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v3/wallets/{address}/transactions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations['getV3WalletTransactions'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AccountDeletionEnvelope: {
      data: {
        /** Format: date-time */
        expiresAt: string;
        receipt: string;
        /** @enum {string} */
        status: 'deleting' | 'deleted';
      };
      meta: components['schemas']['Meta'];
    };
    AccountDeletionStatusEnvelope: {
      data: {
        /** @enum {string} */
        status: 'deleting' | 'deleted';
      };
      meta: components['schemas']['Meta'];
    };
    Asset: {
      activity: {
        buyVolume24hUsd: number | null;
        sellVolume24hUsd: number | null;
        volume24hUsd: number | null;
      };
      change24hPct: number | null;
      circulatingSupply: number | null;
      decimals: number | null;
      fullyDilutedValuationUsd: number | null;
      holderCount: number | null;
      iconUrl: string | null;
      liquidityUsd: number | null;
      marketCapUsd: number | null;
      mint: string | null;
      name: string | null;
      priceUsd: number | null;
      quality: {
        /** @description Provider-backed audit fields; not a security guarantee. */
        audit:
          | {
              [key: string]: unknown;
            }
          | unknown[]
          | null;
        organicScore: number | null;
        organicScoreLabel: string | null;
      };
      symbol: string | null;
      totalSupply: number | null;
      verification: {
        isVerified: boolean;
        tags: string[];
      };
    };
    AssetDetailEnvelope: components['schemas']['Envelope'] & {
      data: components['schemas']['Asset'] & {
        history?: {
          /** Format: date-time */
          fetchedAt: string | null;
          points: components['schemas']['HistoryPoint'][] | null;
          state: string;
        };
      };
    };
    AssetListEnvelope: components['schemas']['Envelope'] & {
      data: components['schemas']['Asset'][];
    };
    AssetTransactionsEnvelope: components['schemas']['Envelope'] & {
      data: {
        nextCursor: string | null;
        transactions: {
          action: string | null;
          protocol: string | null;
          signature: string;
          slot: number | null;
          /** @enum {string|null} */
          status: 'success' | 'failed' | null;
          summary: string | null;
          /** Format: date-time */
          timestamp: string | null;
          transfers: {
            amount: string | null;
            atomicAmount: components['schemas']['AtomicAmount'];
            decimals: number;
            from: string | null;
            fromTokenAccount: string | null;
            to: string | null;
            toTokenAccount: string | null;
          }[];
        }[];
      };
    };
    /** @description Exact base-unit amount; never a JSON number. */
    AtomicAmount: string;
    Candle: {
      closeUsd: number;
      highUsd: number;
      lowUsd: number;
      openUsd: number;
      /** Format: date-time */
      timestamp: string;
      volume: number;
      volumeUsd: number;
    };
    CandlesEnvelope: components['schemas']['Envelope'] & {
      data: {
        candles: components['schemas']['Candle'][] | null;
        /** @constant */
        count: 300;
        mint: string;
        timeframe: string;
      };
    };
    CatalogsEnvelope: components['schemas']['Envelope'] & {
      data: {
        recent: components['schemas']['Asset'][];
        topTraded: components['schemas']['Asset'][];
        trending: components['schemas']['Asset'][];
      };
    };
    DefiLlamaEnvelope: components['schemas']['Envelope'] & {
      data: {
        dexes: {
          items: {
            change1dPct: number | null;
            logo: string | null;
            name: string;
            slug: string;
            total7dUsd: number | null;
            total24hUsd: number | null;
          }[];
          total7dUsd: number | null;
          total24hUsd: number | null;
        };
        /** Format: date-time */
        fetchedAt: string | null;
        protocols: {
          items: {
            category: string | null;
            change1dPct: number | null;
            change7dPct: number | null;
            logo: string | null;
            name: string;
            slug: string;
            solanaTvlUsd: number;
          }[];
          total: number;
        };
        /** @constant */
        source: 'defillama';
      };
    };
    DistributionEnvelope: components['schemas']['Envelope'] & {
      data: {
        accounts: {
          amount: string | null;
          atomicAmount: components['schemas']['AtomicAmount'];
          decimals: number;
          frozen: boolean | null;
          owner: string | null;
          rank: number;
          supplyPercent: string | null;
          tokenAccount: string;
        }[];
        slot: number | null;
        supplyAtomic: string | null;
      };
    };
    Envelope: {
      data: unknown;
      meta: components['schemas']['Meta'];
    };
    ErrorEnvelope: {
      error: {
        code: string;
        message: string;
        requestId: string;
      };
    };
    HealthEnvelope: components['schemas']['Envelope'] & {
      data: {
        /** @constant */
        status: 'ok';
        version: string;
      };
    };
    HistoryEnvelope: components['schemas']['Envelope'] & {
      data: {
        mint: string;
        points: components['schemas']['HistoryPoint'][] | null;
        /** @enum {string} */
        range: '1d' | '7d';
      };
    };
    HistoryPoint: {
      priceUsd: number;
      /** Format: date-time */
      timestamp: string;
    };
    Holder: {
      amount: string | null;
      atomicAmount: components['schemas']['AtomicAmount'];
      decimals: number;
      delegated: string | null;
      frozen: boolean | null;
      owner: string | null;
      tokenAccount: string | null;
    };
    HoldersEnvelope: components['schemas']['Envelope'] & {
      data: {
        cursor: string | null;
        holders: components['schemas']['Holder'][];
        page: number;
        total: number | null;
      };
    };
    Meta: {
      providerStop?: components['schemas']['ProviderStop'];
      requestId: string;
    };
    NetworkData: {
      chain: components['schemas']['NetworkGroup'] & {
        blockHeight?: number | null;
        blockTime?: number | null;
        commitment?: string;
        confirmedSlot?: number | null;
        epoch?: number | null;
        epochProgressPct?: number | null;
        finalizedSlot?: number | null;
        processedSlot?: number | null;
        slotIndex?: number | null;
        slotsInEpoch?: number | null;
      };
      economics?: components['schemas']['NetworkGroup'] & {
        circulatingSol?: number | null;
        inflationEpoch?: number | null;
        inflationFoundationPct?: number | null;
        inflationGovernor?: {
          [key: string]: unknown;
        } | null;
        inflationTotalPct?: number | null;
        inflationValidatorPct?: number | null;
        nonCirculatingSol?: number | null;
        totalSol?: number | null;
      };
      fees: components['schemas']['NetworkGroup'] & {
        averageFeeLamports?: number | null;
        feeSampleCount?: number;
        medianPriorityFeeMicroLamports?: number | null;
        priorityFeeSampleCount?: number;
      };
      /** Format: date-time */
      fetchedAt: string | null;
      performance: components['schemas']['NetworkGroup'] & {
        nonVoteTps?: number | null;
        nonVoteTransactions?: number | null;
        sampleCount?: number;
        samplePeriodSecs?: number;
        tps?: number | null;
        transactions?: number;
      };
      production?: components['schemas']['NetworkGroup'] & {
        assignedLeaderSlots?: number;
        blocksProduced?: number;
        missedLeaderSlots?: number;
        productionPct?: number | null;
        range?: {
          [key: string]: unknown;
        } | null;
      };
      reliability?: components['schemas']['NetworkGroup'] & {
        available?: boolean;
        blockHeight?: number | null;
        blockTime?: number | null;
        failedTransactions?: number | null;
        failurePct?: number | null;
        finalizedSlot?: number | null;
        transactionCount?: number;
      };
      source: string;
      validators?: components['schemas']['NetworkGroup'] & {
        currentVoteAccounts?: number;
        delinquentVoteAccounts?: number;
      };
    };
    NetworkEnvelope: components['schemas']['Envelope'] & {
      data: components['schemas']['NetworkData'];
    };
    /** @description Metrics are optional when a group is unavailable; retained metrics can be stale. */
    NetworkGroup: {
      /** Format: date-time */
      asOf?: string | null;
      /** @enum {string} */
      state?: 'fresh' | 'stale' | 'unavailable';
    };
    OnchainAssetEnvelope: components['schemas']['Envelope'] & {
      /** @description Fresh provider profiles populate all fields; compatible cached profiles may contain only the mint or partial metadata. */
      data: {
        interface?: string | null;
        lastIndexedSlot?: number | null;
        metadata?: {
          description?: string | null;
          externalUrl?: string | null;
          image?: string | null;
          name?: string | null;
          symbol?: string | null;
          uri?: string | null;
        };
        mint: string;
        mintState?: {
          decimals?: number | null;
          extensions?: string[];
          freezeAuthority?: string | null;
          isMutable?: boolean | null;
          mintAuthority?: string | null;
          supply?: string | null;
          supplyAtomic?: string | null;
        };
        tokenProgram?: string | null;
      };
    };
    /** @description Stop queued provider work even when the response retains usable partial wallet balances. Absence does not guarantee all holdings are priced. Budget exhaustion is reserved for separately approved budget enforcement. */
    ProviderStop: {
      /** @enum {string} */
      provider: 'helius' | 'jupiter';
      /** @enum {string} */
      reason: 'throttled' | 'unavailable' | 'budget-exhausted';
    };
    ReadyEnvelope: components['schemas']['Envelope'] & {
      data: {
        snapshotState: string;
        /** @constant */
        status: 'ready';
      };
    };
    RecentTransaction: {
      action: string | null;
      /** Format: date-time */
      blockTime: string | null;
      signature: string;
      slot: number;
      /** @enum {string} */
      status: 'confirmed';
    };
    RecentTransactionsEnvelope: components['schemas']['Envelope'] & {
      data: {
        network: components['schemas']['NetworkData'];
        transactions: components['schemas']['RecentTransaction'][];
      };
    };
    RefreshEnvelope: components['schemas']['Envelope'] & {
      data: {
        /** Format: date-time */
        createdAt: string;
        /** @constant */
        status: 'refreshed';
      };
    };
    StatusEnvelope: components['schemas']['Envelope'] & {
      data: {
        /** @constant */
        chain: 'solana';
        freshness: {
          /** Format: date-time */
          marketDataAsOf: string;
          /** @enum {string} */
          snapshot: 'fresh' | 'stale' | 'fixture';
          /** Format: date-time */
          snapshotCreatedAt: string;
        };
        provenance: {
          market: string;
          reviewedSwaps: string;
          snapshot: string;
        };
        reviewedSwaps: {
          count: number;
          scope: string;
        };
        version: string;
      };
    };
    SwapAmount: {
      atomicAmount: string;
      decimals: number | null;
      mint: string | null;
    };
    SwapsEnvelope: components['schemas']['Envelope'] & {
      data: {
        scope: string;
        swaps: {
          id: string | null;
          input: components['schemas']['SwapAmount'] | null;
          output: components['schemas']['SwapAmount'] | null;
          protocol: string | null;
          /** Format: date-time */
          timestamp: string | null;
          wallet: string | null;
        }[];
      };
    };
    TransactionsEnvelope: components['schemas']['Envelope'] & {
      data: {
        events: components['schemas']['WalletEvent'][];
        nextCursor: string | null;
      };
    };
    WalletBalance: {
      amount: string | null;
      atomicAmount: components['schemas']['AtomicAmount'];
      decimals: number;
      iconUrl: string | null;
      mint: string;
      name: string | null;
      priceUsd: number | null;
      symbol: string | null;
      valueUsd: number | null;
    };
    WalletEnvelope: components['schemas']['Envelope'] & {
      /** @description Fresh DAS responses populate balances and valuation; compatible cached wallet records can omit those fields. */
      data: {
        address: string;
        balances?: components['schemas']['WalletBalance'][];
        holdingsTruncated?: boolean;
        valuation?: components['schemas']['WalletValuation'];
      };
    };
    WalletEvent: {
      description: string | null;
      id: string | null;
      source: string | null;
      /** @enum {string} */
      status: 'success' | 'failed';
      summary: string | null;
      /** Format: date-time */
      timestamp: string | null;
      transfers: {
        native: {
          atomicAmount: string | null;
          /** @constant */
          decimals: 9;
          from: string | null;
          to: string | null;
        }[];
        tokens: {
          atomicAmount: string | null;
          decimals: number | null;
          from: string | null;
          fromTokenAccount: string | null;
          mint: string | null;
          to: string | null;
          tokenStandard: string | null;
          toTokenAccount: string | null;
        }[];
      };
      type: string | null;
    };
    /** @description Fields may be absent in compatible partial cache records. */
    WalletValuation: {
      complete?: boolean;
      holdingCount?: number;
      pricedHoldingCount?: number;
      pricedSubtotalUsd?: number;
      unpricedHoldingCount?: number;
    };
    WatchlistEnvelope: {
      data: {
        assets: components['schemas']['WatchlistItem'][];
        wallets: components['schemas']['WatchlistItem'][];
      };
      meta: components['schemas']['Meta'];
    };
    WatchlistItem: {
      address: string;
      /** Format: date-time */
      savedAt: string;
    };
    WatchlistRemoveEnvelope: {
      data: {
        /** @constant */
        removed: true;
      };
      meta: components['schemas']['Meta'];
    };
    WatchlistSaveEnvelope: {
      data: {
        address: string;
        /** @enum {string} */
        kind: 'asset' | 'wallet';
        /** Format: date-time */
        savedAt: string;
      };
      meta: components['schemas']['Meta'];
    };
  };
  responses: {
    /** @description Canonical asset with optional compatibility history. */
    AssetDetail: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['AssetDetailEnvelope'];
      };
    };
    /** @description Canonical Jupiter asset list. */
    AssetList: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['AssetListEnvelope'];
      };
    };
    /** @description Mint-address transaction-history page. */
    AssetTransactions: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['AssetTransactionsEnvelope'];
      };
    };
    /** @description Fixed page of 300 Birdeye USD OHLCV candles, or null when unavailable. */
    Candles: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['CandlesEnvelope'];
      };
    };
    /** @description Snapshot-backed discovery catalogs. */
    Catalogs: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['CatalogsEnvelope'];
      };
    };
    /** @description Ambiguous legacy symbol lookup. */
    Conflict: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Cached DefiLlama dashboard. */
    DefiLlama: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['DefiLlamaEnvelope'];
      };
    };
    /** @description Largest token accounts, not unique holders. */
    Distribution: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['DistributionEnvelope'];
      };
    };
    /** @description Successful JSON envelope. */
    Envelope: {
      headers: {
        'Cache-Control': components['headers']['CacheControl'];
        'X-Request-Id': components['headers']['RequestId'];
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Envelope'];
      };
    };
    /** @description Worker is running. */
    Health: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['HealthEnvelope'];
      };
    };
    /** @description Close-price history projected from Birdeye USD candles. */
    History: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['HistoryEnvelope'];
      };
    };
    /** @description Helius token-account page, not a unique-holder count. */
    Holders: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['HoldersEnvelope'];
      };
    };
    /** @description Invalid path or query parameter. */
    InvalidRequest: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Solana network dashboard data or an explicit unavailable fixture. */
    Network: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['NetworkEnvelope'];
      };
    };
    /** @description Requested resource was not found. */
    NotFound: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Snapshot KV binding or resolved data is unavailable. */
    NotReady: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Helius token profile and mint state. */
    OnchainAsset: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['OnchainAssetEnvelope'];
      };
    };
    /** @description Sanitized error. AUTH_REQUIRED/AUTH_INVALID (401), EMAIL_VERIFICATION_REQUIRED/ACCOUNT_DELETING (403), INVALID_WATCHLIST_ITEM (400), WATCHLIST_LIMIT_REACHED (409), RATE_LIMITED (429), AUTH_UNAVAILABLE/WATCHLIST_UNAVAILABLE (503). Private responses are never cached. */
    PrivateFailure: {
      headers: {
        /** @description Present for rate-limit errors, in seconds. */
        'Retry-After'?: number;
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Upstream provider data is unavailable. */
    ProviderUnavailable: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description A usable resolved snapshot is available. */
    Ready: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ReadyEnvelope'];
      };
    };
    /** @description Representative dashboard sample refreshed at most every 60 seconds while active. */
    RecentTransactions: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['RecentTransactionsEnvelope'];
      };
    };
    /** @description Snapshot refresh completed. */
    RefreshCompleted: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['RefreshEnvelope'];
      };
    };
    /** @description REFRESH_FAILED. */
    RefreshFailed: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description REFRESH_UNAUTHORIZED. */
    RefreshUnauthorized: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['ErrorEnvelope'];
      };
    };
    /** @description Canonical version, provenance, and freshness. */
    Status: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['StatusEnvelope'];
      };
    };
    /** @description Reviewed swaps from the registered tracked pools only. */
    Swaps: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['SwapsEnvelope'];
      };
    };
    /** @description Parsed wallet event page. */
    Transactions: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['TransactionsEnvelope'];
      };
    };
    /** @description DAS balances and valuation. */
    Wallet: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['WalletEnvelope'];
      };
    };
  };
  parameters: {
    /** @description Exclusive-end Unix timestamp in seconds. */
    CandleBefore: number;
    /** @description Exact-case native Birdeye duration. */
    CandleTimeframe:
      | '1s'
      | '15s'
      | '30s'
      | '1m'
      | '3m'
      | '5m'
      | '15m'
      | '30m'
      | '1H'
      | '2H'
      | '4H'
      | '6H'
      | '8H'
      | '12H'
      | '1D'
      | '3D'
      | '1W'
      | '1M';
    /** @description Opaque provider pagination token. */
    Cursor: string;
    HistoryRange: '1d' | '7d';
    HolderPage: number;
    /** @description Set false to omit compatibility history from asset detail. */
    IncludeHistory: boolean;
    /** @description Deprecated alias for a canonical mint address. */
    LegacyAssetId: string;
    /** @description Canonical Solana mint address. */
    Mint: string;
    RecentTransactionLimit: number;
    /** @description Deprecated symbol lookup; symbols can be ambiguous. */
    Symbol: string;
    TransactionLimit: number;
    /** @description Public Solana wallet address. */
    WalletAddress: string;
  };
  requestBodies: never;
  headers: {
    /** @description Route-specific cache policy. */
    CacheControl: string;
    /** @description Request correlation identifier. */
    RequestId: string;
  };
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getHealth: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Health'];
    };
  };
  refreshSnapshot: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['RefreshCompleted'];
      401: components['responses']['RefreshUnauthorized'];
      502: components['responses']['RefreshFailed'];
    };
  };
  getReadiness: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Ready'];
      503: components['responses']['NotReady'];
    };
  };
  listV1Assets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV1AssetBySymbol: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Deprecated symbol lookup; symbols can be ambiguous. */
        symbol: components['parameters']['Symbol'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
      409: components['responses']['Conflict'];
    };
  };
  getV1AssetById: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Deprecated alias for a canonical mint address. */
        id: components['parameters']['LegacyAssetId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
    };
  };
  getV1AssetByMint: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
    };
  };
  getV1Market: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV1Status: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  listV1Swaps: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  listV1Wallets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV1Wallet: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Public Solana wallet address. */
        address: components['parameters']['WalletAddress'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      400: components['responses']['InvalidRequest'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  listV2Assets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV2AssetBySymbol: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Deprecated symbol lookup; symbols can be ambiguous. */
        symbol: components['parameters']['Symbol'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
      409: components['responses']['Conflict'];
    };
  };
  getV2AssetById: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Deprecated alias for a canonical mint address. */
        id: components['parameters']['LegacyAssetId'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
    };
  };
  getV2AssetByMint: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      404: components['responses']['NotFound'];
    };
  };
  getV2Market: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV2Status: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  listV2Swaps: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  listV2Wallets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
    };
  };
  getV2Wallet: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Public Solana wallet address. */
        address: components['parameters']['WalletAddress'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Envelope'];
      400: components['responses']['InvalidRequest'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  listV3Assets: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['AssetList'];
    };
  };
  getV3AssetByMint: {
    parameters: {
      query?: {
        /** @description Set false to omit compatibility history from asset detail. */
        includeHistory?: components['parameters']['IncludeHistory'];
        range?: components['parameters']['HistoryRange'];
      };
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['AssetDetail'];
      400: components['responses']['InvalidRequest'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetCandles: {
    parameters: {
      query?: {
        /** @description Exclusive-end Unix timestamp in seconds. */
        before?: components['parameters']['CandleBefore'];
        /** @description Exact-case native Birdeye duration. */
        timeframe?: components['parameters']['CandleTimeframe'];
      };
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Candles'];
      400: components['responses']['InvalidRequest'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetDistribution: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Distribution'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetHistory: {
    parameters: {
      query?: {
        range?: components['parameters']['HistoryRange'];
      };
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['History'];
      400: components['responses']['InvalidRequest'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetHolders: {
    parameters: {
      query?: {
        page?: components['parameters']['HolderPage'];
      };
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Holders'];
      400: components['responses']['InvalidRequest'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetOnchain: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['OnchainAsset'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3AssetTransactions: {
    parameters: {
      query?: {
        /** @description Opaque provider pagination token. */
        cursor?: components['parameters']['Cursor'];
        limit?: components['parameters']['TransactionLimit'];
      };
      header?: never;
      path: {
        /** @description Canonical Solana mint address. */
        mint: components['parameters']['Mint'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['AssetTransactions'];
      400: components['responses']['InvalidRequest'];
      404: components['responses']['NotFound'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3Catalogs: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Catalogs'];
    };
  };
  getV3DefiLlamaDashboard: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['DefiLlama'];
    };
  };
  deletePrivateAccount: {
    parameters: {
      query?: never;
      header?: {
        /** @description Required with Firebase authentication to explicitly confirm permanent deletion; no undo. */
        'X-Iris-Confirm-Deletion'?: 'permanent';
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Current lifecycle for an accepted receipt. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AccountDeletionStatusEnvelope'];
        };
      };
      /** @description Purge and cleanup intent committed, not a claim that Firebase deletion completed. Receipt expires one hour after acceptance and is memory-only. */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AccountDeletionEnvelope'];
        };
      };
      400: components['responses']['PrivateFailure'];
      401: components['responses']['PrivateFailure'];
      403: components['responses']['PrivateFailure'];
      429: components['responses']['PrivateFailure'];
      503: components['responses']['PrivateFailure'];
    };
  };
  getAccountDeletionStatus: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Current deletion status. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AccountDeletionStatusEnvelope'];
        };
      };
      400: components['responses']['PrivateFailure'];
      401: components['responses']['PrivateFailure'];
      429: components['responses']['PrivateFailure'];
      503: components['responses']['PrivateFailure'];
    };
  };
  getPrivateWatchlist: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private saved references, newest first within each section. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WatchlistEnvelope'];
        };
      };
      400: components['responses']['PrivateFailure'];
      401: components['responses']['PrivateFailure'];
      403: components['responses']['PrivateFailure'];
      429: components['responses']['PrivateFailure'];
      503: components['responses']['PrivateFailure'];
    };
  };
  savePrivateWatchlistItem: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Case-sensitive Base58 public key decoding to exactly 32 bytes. */
        address: string;
        kind: 'asset' | 'wallet';
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Newly saved or previously saved reference. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WatchlistSaveEnvelope'];
        };
      };
      400: components['responses']['PrivateFailure'];
      401: components['responses']['PrivateFailure'];
      403: components['responses']['PrivateFailure'];
      409: components['responses']['PrivateFailure'];
      429: components['responses']['PrivateFailure'];
      503: components['responses']['PrivateFailure'];
    };
  };
  removePrivateWatchlistItem: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Case-sensitive Base58 public key decoding to exactly 32 bytes. */
        address: string;
        kind: 'asset' | 'wallet';
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Reference is absent. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['WatchlistRemoveEnvelope'];
        };
      };
      400: components['responses']['PrivateFailure'];
      401: components['responses']['PrivateFailure'];
      403: components['responses']['PrivateFailure'];
      429: components['responses']['PrivateFailure'];
      503: components['responses']['PrivateFailure'];
    };
  };
  getV3Network: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Network'];
    };
  };
  getV3Status: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Status'];
    };
  };
  listV3Swaps: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Swaps'];
    };
  };
  listV3RecentTransactions: {
    parameters: {
      query?: {
        limit?: components['parameters']['RecentTransactionLimit'];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['RecentTransactions'];
      400: components['responses']['InvalidRequest'];
    };
  };
  getV3Wallet: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Public Solana wallet address. */
        address: components['parameters']['WalletAddress'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Wallet'];
      400: components['responses']['InvalidRequest'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3WalletEvents: {
    parameters: {
      query?: {
        /** @description Opaque provider pagination token. */
        cursor?: components['parameters']['Cursor'];
        limit?: components['parameters']['TransactionLimit'];
      };
      header?: never;
      path: {
        /** @description Public Solana wallet address. */
        address: components['parameters']['WalletAddress'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Transactions'];
      400: components['responses']['InvalidRequest'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
  getV3WalletTransactions: {
    parameters: {
      query?: {
        /** @description Opaque provider pagination token. */
        cursor?: components['parameters']['Cursor'];
        limit?: components['parameters']['TransactionLimit'];
      };
      header?: never;
      path: {
        /** @description Public Solana wallet address. */
        address: components['parameters']['WalletAddress'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: components['responses']['Transactions'];
      400: components['responses']['InvalidRequest'];
      503: components['responses']['ProviderUnavailable'];
    };
  };
}
