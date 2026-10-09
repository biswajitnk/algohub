import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firebase Firestore Sync Service for AlgoHub
 * Real-time synchronization of Active Positions, Trade History, and Portfolio Stats
 * to the connected Firebase Project (algohub-bot-2026).
 */

export const firebaseSync = {
  /**
   * Sync active positions to Firestore
   */
  async syncPositions(positions = [], user = null) {
    if (!db || !positions) return;
    try {
      const uid = user?.uid || 'default';

      // 1. Write current open positions
      const currentIds = new Set();
      for (const pos of positions) {
        const docId = `pos_${pos.id || pos.symbol}`;
        currentIds.add(docId);
        const posDocRef = doc(db, 'users', uid, 'positions', docId);

        await setDoc(posDocRef, {
          id: pos.id,
          symbol: pos.symbol,
          strategy_name: pos.strategy_name || 'Delta Live',
          side: pos.side,
          mode: pos.mode || 'PAPER',
          entry_price: Number(pos.entry_price || 0),
          current_price: Number(pos.current_price || pos.entry_price || 0),
          size: Number(pos.size || 0),
          contracts: Number(pos.contracts || 1),
          leverage: Number(pos.leverage || 1),
          stop_loss: pos.stop_loss ? Number(pos.stop_loss) : null,
          take_profit: pos.take_profit ? Number(pos.take_profit) : null,
          pnl: Number(pos.pnl || 0),
          pnl_pct: Number(pos.pnl_pct || 0),
          status: 'OPEN',
          updated_at: serverTimestamp()
        }, { merge: true });
      }

      // 2. Remove any positions from Firestore that are no longer open in backend
      const existingSnap = await getDocs(collection(db, 'users', uid, 'positions'));
      for (const docSnap of existingSnap.docs) {
        if (!currentIds.has(docSnap.id)) {
          await deleteDoc(docSnap.ref);
        }
      }
    } catch (err) {
      console.warn('[FirebaseSync] Failed to sync positions to Firestore:', err.message);
    }
  },

  /**
   * Sync closed trade history to Firestore
   */
  async syncTrades(trades = [], user = null) {
    if (!db || !trades || trades.length === 0) return;
    try {
      const uid = user?.uid || 'default';
      for (const trade of trades.slice(0, 50)) {
        const docId = `trade_${trade.id}`;
        const tradeDocRef = doc(db, 'users', uid, 'trades', docId);

        await setDoc(tradeDocRef, {
          id: trade.id,
          symbol: trade.symbol,
          strategy_name: trade.strategy_name,
          side: trade.side,
          mode: trade.mode,
          entry_price: Number(trade.entry_price || 0),
          exit_price: Number(trade.exit_price || 0),
          size: Number(trade.size || 0),
          contracts: Number(trade.contracts || 1),
          leverage: Number(trade.leverage || 1),
          stop_loss: trade.stop_loss ? Number(trade.stop_loss) : null,
          take_profit: trade.take_profit ? Number(trade.take_profit) : null,
          pnl: Number(trade.pnl || 0),
          pnl_pct: Number(trade.pnl_pct || 0),
          status: trade.status || 'CLOSED',
          exit_reason: trade.exit_reason || null,
          created_at: trade.created_at || null,
          closed_at: trade.closed_at || null,
          synced_at: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[FirebaseSync] Failed to sync trade history to Firestore:', err.message);
    }
  },

  /**
   * Sync portfolio summary stats
   */
  async syncStats(stats, user = null) {
    if (!db || !stats) return;
    try {
      const uid = user?.uid || 'default';
      const statsDocRef = doc(db, 'users', uid, 'stats', 'summary');

      await setDoc(statsDocRef, {
        total_balance: Number(stats.total_balance || 0),
        available_balance: Number(stats.available_balance || 0),
        today_pnl: Number(stats.today_pnl || 0),
        today_pnl_pct: Number(stats.today_pnl_pct || 0),
        all_time_pnl: Number(stats.all_time_pnl || 0),
        win_rate: Number(stats.win_rate || 0),
        active_bots: Number(stats.active_bots || 0),
        open_positions_count: Number(stats.open_positions_count || 0),
        mode: stats.mode || 'PAPER',
        updated_at: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('[FirebaseSync] Failed to sync stats to Firestore:', err.message);
    }
  },

  /**
   * Real-time listener for active positions from Firestore
   */
  subscribeToPositions(user, onUpdate) {
    if (!db || !onUpdate) return () => {};
    try {
      const uid = user?.uid || 'default';
      const q = collection(db, 'users', uid, 'positions');
      return onSnapshot(q, (snapshot) => {
        const positions = snapshot.docs.map(doc => ({ id: doc.data().id, ...doc.data() }));
        onUpdate(positions);
      }, (err) => {
        console.warn('[FirebaseSync] Positions subscription error:', err);
      });
    } catch (e) {
      return () => {};
    }
  },

  /**
   * Real-time listener for trade history from Firestore
   */
  subscribeToTrades(user, onUpdate) {
    if (!db || !onUpdate) return () => {};
    try {
      const uid = user?.uid || 'default';
      const q = query(collection(db, 'users', uid, 'trades'), orderBy('closed_at', 'desc'), limit(50));
      return onSnapshot(q, (snapshot) => {
        const trades = snapshot.docs.map(doc => ({ id: doc.data().id, ...doc.data() }));
        onUpdate(trades);
      }, (err) => {
        console.warn('[FirebaseSync] Trades subscription error:', err);
      });
    } catch (e) {
      return () => {};
    }
  }
};
