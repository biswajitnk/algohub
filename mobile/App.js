import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  RefreshControl, TextInput, Alert, SafeAreaView, StatusBar, Platform 
} from 'react-native';
import { mobileApi, setVpsUrl, getVpsUrl } from './src/services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'positions', 'bots', 'alerts', 'settings'
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [stats, setStats] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [bots, setBots] = useState([]);
  const [serverUrl, setServerUrl] = useState(getVpsUrl());
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  const loadAllData = async () => {
    try {
      const [s, p, t, b] = await Promise.all([
        mobileApi.getStats().catch(() => null),
        mobileApi.getOpenTrades().catch(() => []),
        mobileApi.getTrades().catch(() => []),
        mobileApi.getBots().catch(() => [])
      ]);

      if (s) {
        setStats(s);
        setConnectionStatus('Connected to 24/7 VPS');
      } else {
        setConnectionStatus('VPS Unreachable');
      }
      setPositions(p || []);
      setTrades(t || []);
      setBots(b || []);
    } catch (e) {
      setConnectionStatus('Connection Error');
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleToggleBot = async (id, name, currentState) => {
    try {
      await mobileApi.toggleBot(id);
      Alert.alert('Success', `Bot ${name} is now ${currentState ? 'PAUSED' : 'RUNNING 24/7'}`);
      loadAllData();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleClosePosition = (id, symbol) => {
    Alert.alert(
      'Close Position',
      `Close market position for ${symbol} immediately?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close Now', 
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.closeTrade(id);
              Alert.alert('Closed', `Position ${symbol} closed.`);
              loadAllData();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleKillSwitch = () => {
    Alert.alert(
      'EMERGENCY KILL SWITCH',
      'This will IMMEDIATELY halt all trading bots and close all open trades on Delta Exchange. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'EXECUTE KILL SWITCH', 
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.triggerKillSwitch();
              Alert.alert('Kill Switch Activated', 'All trading halted.');
              loadAllData();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleSaveVpsUrl = () => {
    setVpsUrl(serverUrl);
    Alert.alert('Saved', 'VPS URL updated. Testing connection...');
    loadAllData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Delta Algo</Text>
            <View style={styles.exchangeBadge}>
              <Text style={styles.exchangeBadgeText}>{stats?.exchange_type || 'INDIA'}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connectionStatus.includes('Connected') ? '#22c55e' : '#f59e0b' }]} />
            <Text style={styles.statusText}>{connectionStatus}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.killButton} onPress={handleKillSwitch}>
          <Text style={styles.killButtonText}>KILL</Text>
        </TouchableOpacity>
      </View>

      {/* Content Scroll View */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            
            {/* Balance Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TOTAL BALANCE</Text>
              <Text style={styles.metricMainValue}>
                ${(stats?.total_balance || 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.metricSub}>
                {stats?.exchange_connected ? 'Live Delta Account' : 'Paper Trading (Simulation)'}
              </Text>
            </View>

            {/* Performance Grid */}
            <View style={styles.gridRow}>
              <View style={[styles.smallCard, { marginRight: 8 }]}>
                <Text style={styles.metricLabel}>TODAY PNL</Text>
                <Text style={[styles.gridValue, { color: (stats?.today_pnl || 0) >= 0 ? '#22c55e' : '#f43f5e' }]}>
                  {(stats?.today_pnl || 0) >= 0 ? '+' : ''}${(stats?.today_pnl || 0).toFixed(2)}
                </Text>
                <Text style={styles.gridSub}>24h Realized</Text>
              </View>

              <View style={[styles.smallCard, { marginLeft: 8 }]}>
                <Text style={styles.metricLabel}>WIN RATE</Text>
                <Text style={styles.gridValue}>{stats?.win_rate || 0}%</Text>
                <Text style={styles.gridSub}>{stats?.win_trades || 0}W / {stats?.loss_trades || 0}L</Text>
              </View>
            </View>

            {/* Quick Status Bar */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerTitle}>⚡ 24/7 VPS Background Execution</Text>
              <Text style={styles.infoBannerDesc}>
                {stats?.active_bots || 0} out of {stats?.total_bots || 0} bots actively monitoring candles on Delta Exchange India.
              </Text>
            </View>

            {/* Open Trades Summary */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open Positions ({positions.length})</Text>
              <TouchableOpacity onPress={() => setActiveTab('positions')}>
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {positions.length > 0 ? (
              positions.slice(0, 3).map(pos => (
                <View key={pos.id} style={styles.cardItem}>
                  <View style={styles.cardRow}>
                    <Text style={styles.symbolText}>{pos.symbol}</Text>
                    <View style={[styles.sideBadge, { backgroundColor: pos.side.toLowerCase() === 'buy' ? '#052e16' : '#4c0519' }]}>
                      <Text style={[styles.sideText, { color: pos.side.toLowerCase() === 'buy' ? '#22c55e' : '#f43f5e' }]}>
                        {pos.side.toUpperCase()} {pos.leverage}x
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardDetailText}>Entry: ${pos.entry_price.toLocaleString()} • Size: ${pos.size}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No positions open right now.</Text>
              </View>
            )}

          </View>
        )}

        {/* TAB 2: POSITIONS */}
        {activeTab === 'positions' && (
          <View style={styles.tabContent}>
            <Text style={styles.screenHeading}>Active Positions</Text>
            {positions.length > 0 ? (
              positions.map(pos => (
                <View key={pos.id} style={styles.cardItem}>
                  <View style={styles.cardRow}>
                    <View>
                      <Text style={styles.symbolText}>{pos.symbol}</Text>
                      <Text style={{ fontSize: 11, color: '#34d399', fontWeight: '600', marginTop: 2 }}>
                        🤖 {pos.strategy_name || 'Delta Live'}
                      </Text>
                    </View>
                    <View style={[styles.sideBadge, { backgroundColor: pos.side.toLowerCase() === 'buy' ? '#052e16' : '#4c0519' }]}>
                      <Text style={[styles.sideText, { color: pos.side.toLowerCase() === 'buy' ? '#22c55e' : '#f43f5e' }]}>
                        {pos.side.toUpperCase()} {pos.leverage}x
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Entry</Text>
                      <Text style={styles.statVal}>${pos.entry_price.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Stop Loss</Text>
                      <Text style={[styles.statVal, { color: '#f43f5e' }]}>${pos.stop_loss || '-'}</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Target</Text>
                      <Text style={[styles.statVal, { color: '#22c55e' }]}>${pos.take_profit || '-'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => handleClosePosition(pos.id, pos.symbol)}
                  >
                    <Text style={styles.closeButtonText}>Close Position at Market</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active positions.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: BOTS */}
        {activeTab === 'bots' && (
          <View style={styles.tabContent}>
            <Text style={styles.screenHeading}>Algorithmic Strategies</Text>
            {bots.map(bot => (
              <View key={bot.id} style={styles.cardItem}>
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.symbolText}>{bot.name}</Text>
                    <Text style={styles.cardSubText}>{bot.symbol} • {bot.strategy_name} ({bot.timeframe})</Text>
                  </View>
                  <View style={[styles.botStatusBadge, { backgroundColor: bot.is_active ? '#052e16' : '#1f2937' }]}>
                    <Text style={[styles.botStatusText, { color: bot.is_active ? '#22c55e' : '#9ca3af' }]}>
                      {bot.is_active ? 'ACTIVE' : 'IDLE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.botParamsRow}>
                  <Text style={styles.paramText}>Alloc: ${bot.allocation_usd} ({bot.leverage}x)</Text>
                  <Text style={styles.paramText}>SL: -{bot.stop_loss_pct}% / TP: +{bot.take_profit_pct}%</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.toggleBotBtn, { backgroundColor: bot.is_active ? '#451a03' : '#22c55e' }]}
                  onPress={() => handleToggleBot(bot.id, bot.name, bot.is_active)}
                >
                  <Text style={[styles.toggleBotBtnText, { color: bot.is_active ? '#f59e0b' : '#000000' }]}>
                    {bot.is_active ? 'Pause Bot' : 'Start 24/7 Execution'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: ALERTS / TRADE HISTORY */}
        {activeTab === 'alerts' && (
          <View style={styles.tabContent}>
            <Text style={styles.screenHeading}>Trade Alerts & Journal</Text>
            {trades.map(t => {
              const isWin = t.pnl > 0;
              return (
                <View key={t.id} style={styles.cardItem}>
                  <View style={styles.cardRow}>
                    <View>
                      <Text style={styles.symbolText}>{t.symbol} ({t.side.toUpperCase()})</Text>
                      <Text style={styles.cardSubText}>{t.strategy_name} • {new Date(t.created_at).toLocaleTimeString()}</Text>
                    </View>
                    <Text style={[styles.pnlText, { color: isWin ? '#22c55e' : '#f43f5e' }]}>
                      {isWin ? '+' : ''}${t.pnl.toFixed(2)} ({isWin ? '+' : ''}{t.pnl_pct.toFixed(1)}%)
                    </Text>
                  </View>
                  <Text style={styles.exitReasonText}>Exit: {t.exit_reason || t.status}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={styles.screenHeading}>VPS Connection & Settings</Text>
            
            <View style={styles.cardItem}>
              <Text style={styles.inputLabel}>VPS Backend URL</Text>
              <TextInput
                style={styles.inputField}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://your-vps-ip:8000"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveVpsUrl}>
                <Text style={styles.primaryButtonText}>Save & Reconnect</Text>
              </TouchableOpacity>
            </View>

            {/* Compliance Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerTitle}>Risk Notice</Text>
              <Text style={styles.disclaimerText}>
                Automated cryptocurrency futures trading involves substantial risk of financial loss. Past performance does not guarantee future results. Ensure stop losses are set and test strategies in Paper mode before live trading.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Navigation Tabs */}
      <View style={styles.bottomNav}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'positions', label: 'Positions' },
          { id: 'bots', label: 'Bots' },
          { id: 'alerts', label: 'Alerts' },
          { id: 'settings', label: 'Settings' }
        ].map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.navButton} 
            onPress={() => setActiveTab(item.id)}
          >
            <Text style={[styles.navText, { color: activeTab === item.id ? '#22c55e' : '#9ca3af' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  exchangeBadge: {
    marginLeft: 8,
    backgroundColor: '#052e16',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#166534'
  },
  exchangeBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#22c55e' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, color: '#9ca3af' },
  killButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  killButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  tabContent: { gap: 14 },
  screenHeading: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  metricCard: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  metricLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  metricMainValue: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginVertical: 4 },
  metricSub: { fontSize: 12, color: '#22c55e' },
  gridRow: { flexDirection: 'row' },
  smallCard: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  gridValue: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginVertical: 4 },
  gridSub: { fontSize: 11, color: '#6b7280' },
  infoBanner: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  infoBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#38bdf8' },
  infoBannerDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#ffffff' },
  seeAllText: { fontSize: 12, color: '#22c55e' },
  cardItem: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symbolText: { fontSize: 15, fontWeight: 'bold', color: '#ffffff' },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sideText: { fontSize: 11, fontWeight: 'bold' },
  cardDetailText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  cardSubText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', marginVertical: 10 },
  statCol: { flex: 1 },
  statLabel: { fontSize: 10, color: '#6b7280' },
  statVal: { fontSize: 13, fontWeight: '600', color: '#e5e7eb', marginTop: 2 },
  closeButton: {
    backgroundColor: '#4c0519',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9f1239'
  },
  closeButtonText: { color: '#f43f5e', fontSize: 12, fontWeight: 'bold' },
  botStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  botStatusText: { fontSize: 10, fontWeight: 'bold' },
  botParamsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  paramText: { fontSize: 11, color: '#9ca3af' },
  toggleBotBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  toggleBotBtnText: { fontSize: 12, fontWeight: 'bold' },
  pnlText: { fontSize: 14, fontWeight: 'bold' },
  exitReasonText: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  inputLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  inputField: {
    backgroundColor: '#0b0f19',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButtonText: { color: '#000000', fontSize: 13, fontWeight: 'bold' },
  disclaimerBox: {
    backgroundColor: '#1e1b4b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#312e81'
  },
  disclaimerTitle: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 4 },
  disclaimerText: { fontSize: 11, color: '#c7d2fe', lineHeight: 16 },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 13 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingVertical: 10
  },
  navButton: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 11, fontWeight: '600' }
});
