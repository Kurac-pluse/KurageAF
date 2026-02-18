from scipy.stats import binomtest

# 実験1のパラメータ
n1 = 20    # 試行回数
k1 = 7     # 正解数
p1 = 0.25  # チャンスレベル（期待される確率）

# 二項検定の実行（両側検定：alternative='two-sided'）
result1 = binomtest(k1, n1, p1, alternative='greater')

print(f"--- 実験1の計算結果 ---")
print(f"p-value (片側): {result1.pvalue:.4f}")

# 実験2のパラメータ
n2 = 92    # 試行回数
k2 = 45    # 正解数
p2 = 0.40  # チャンスレベル

# 二項検定の実行（両側検定）
result2 = binomtest(k2, n2, p2, alternative='two-sided')

print(f"\n--- 実験2の計算結果 ---")
print(f"p-value (両側): {result2.pvalue:.4f}")
