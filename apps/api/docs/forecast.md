# Explainable Poisson Bed & Equipment Availability Forecasting

This document specifies the mathematical foundation, queuing formulation, parameter estimation, and confidence scoring for the **LifeLink CityHealth** forecasting engine.

---

## 1. System Model & Objectives

In hospital emergency logistics, static inventory snapshots ("5 beds free now") rapidly become obsolete due to concurrent arrivals, emergency surgeries, and planned patient discharges. 

The forecasting engine provides **short-term probabilistic projections** for horizons $t \in \{1, 3, 6\}$ hours:
- **Expected Free Beds** ($E[F_t]$): The mean predicted free bed count at horizon $t$.
- **Availability Confidence Bounds** ($p_{10}, p_{90}$): 10th percentile (conservative estimate under surge load) and 90th percentile (optimistic scenario).
- **Probability of At Least One Free Bed** ($P(F_t \ge 1)$): Decision metric for dispatching patients to this ward.
- **Equipment Recovery Projections**: Estimated time until currently occupied equipment (`IN_USE`) transitions back to `AVAILABLE`.

---

## 2. Mathematical Formulation

### 2.1 Poisson Arrival & Discharge Queuing Model

Let $F_0$ be the current derived free beds in ward $W$ at current time $t_0$:
$$F_0 = \max(0, \text{total} - (\text{occupied} + \text{reserved} + \text{cleaning} + \text{maintenance}))$$

Let $C$ be the maximum operational capacity of the ward:
$$C = \text{total} - \text{maintenance}$$

Over horizon $t$ hours:
- Patient admissions follow an inhomogeneous Poisson process with rate parameter $\lambda_A(t) = \sum_{\tau=1}^t A(h_0 + \tau)$, where $A(h)$ is the estimated hourly admission rate.
- Patient discharges follow an inhomogeneous Poisson process with rate parameter $\lambda_D(t) = \sum_{\tau=1}^t D(h_0 + \tau)$, where $D(h)$ is the estimated hourly discharge rate.

If medical staff have logged deterministic scheduled discharges $N_{\text{exp}}$ in the table `expected_discharges` for $[t_0, t_0 + t]$, the effective discharge parameter incorporates these confirmed events:
$$\lambda_D(t) = \max\left(\sum_{\tau=1}^t D(h_0 + \tau), N_{\text{exp}}\right)$$

### 2.2 Discrete State Convolution

Let $X \sim \text{Poisson}(\lambda_A)$ be total admissions during $[t_0, t_0 + t]$:
$$P(X = k) = \frac{\lambda_A^k e^{-\lambda_A}}{k!}, \quad k \ge 0$$

Let $Y \sim \text{Poisson}(\lambda_D)$ be total discharges during $[t_0, t_0 + t]$:
$$P(Y = j) = \frac{\lambda_D^j e^{-\lambda_D}}{j!}, \quad j \ge 0$$

The unconstrained net bed delta is $Z = Y - X$. Because hospital beds are bounded physically between 0 and maximum operational capacity $C$, the state variable at horizon $t$ is:
$$F_t = \min\Big(C, \max\big(0, F_0 + Y - X\big)\Big)$$

We compute the exact probability distribution $P(F_t = s)$ for $s \in [0, C]$ using truncated discrete bivariate convolution:
$$P(F_t = s) = \sum_{j=0}^{K} \sum_{k=0}^{K} P(Y = j) \cdot P(X = k) \cdot \mathbb{I}\left(\text{clamp}(F_0 + j - k, 0, C) = s\right)$$
where $K = \max\big(35, \lceil \lambda + 5\sqrt{\lambda} \rceil\big)$ captures $> 99.999\%$ of the Poisson probability mass.

### 2.3 Derived Summary Metrics

From the discrete distribution $\{P(F_t = s)\}_{s=0}^C$, we derive:

1. **Expected Free Beds**:
   $$E[F_t] = \sum_{s=0}^C s \cdot P(F_t = s)$$

2. **Probability of At Least One Free Bed**:
   $$P(F_t \ge 1) = 1 - P(F_t = 0) = \sum_{s=1}^C P(F_t = s)$$

3. **Pessimistic Scenario ($p_{10}$)**:
   $$p_{10} = \min \left\{ s \in [0, C] : \sum_{u=0}^s P(F_t = u) \ge 0.10 \right\}$$

4. **Optimistic Scenario ($p_{90}$)**:
   $$p_{90} = \min \left\{ s \in [0, C] : \sum_{u=0}^s P(F_t = u) \ge 0.90 \right\}$$

---

## 3. Parameter Estimation & Fallback Hierarchy

To evaluate $A(h)$ and $D(h)$ for hour-of-week $h \in [0, 167]$:

1. **Primary (Weighted 4-Week Hour-of-Week Recency)**:
   $$\bar{R}(h) = 0.40 \cdot R_{w-1}(h) + 0.30 \cdot R_{w-2}(h) + 0.20 \cdot R_{w-3}(h) + 0.10 \cdot R_{w-4}(h)$$
2. **Fallback Level 1 (Hour-of-Day Average)**:
   If fewer than 7 days of historical flow exist for that specific hour-of-week, fallback to the ward's average for that hour across all recorded days:
   $$\bar{R}_{\text{hod}}(h \pmod{24}) = \frac{1}{N} \sum_{d} R(d, h \pmod{24})$$
3. **Fallback Level 2 (Ward Static Prior)**:
   If no hourly data exists, default to ward capacity priors (e.g. ICU: $\lambda_A = 0.3/\text{hr}, \lambda_D = 0.25/\text{hr}$; General: $\lambda_A = 1.2/\text{hr}, \lambda_D = 1.4/\text{hr}$).

### 3.1 Confidence Scoring

Confidence is assigned based on historical sample size in `bed_flow_hourly`:
- **`HIGH`**: $\ge 14$ days of continuous data AND $\ge 100$ total flow events.
- **`MEDIUM`**: $\ge 7$ days of data AND $\ge 30$ flow events.
- **`LOW`**: $< 7$ days of data (uses fallback priors).

---

## 4. Equipment Availability Forecasting

For equipment currently in use (`IN_USE`):
1. **Explicit Return Time**: If `available_at` timestamp is explicitly recorded, remaining wait time is:
   $$\Delta t = \max(0, \text{available\_at} - \text{now})$$
2. **Historical Empirical Duration**: If `available_at` is null, calculate average `IN_USE` duration from `equipment_status_log` for that equipment type (e.g. CT: 45 min, MRI: 60 min, Dialysis: 240 min):
   $$\Delta t = \max(0, \bar{T}_{\text{in\_use}} - (\text{now} - \text{status\_changed\_at}))$$

