# Physical quantities and measurements

Quantity names and units are separate grammar elements. “Energy equals twenty joules” gives E = 20 J; the variable is mathematical italic and the unit symbol is upright. Measurements can stand alone or compose inside equations, fractions and selection replacements. This is notation recognition, not numerical unit conversion, dimensional validation, or an automatic choice of physical model.

The catalog covers 161 quantity defaults across coordinate geometry, mechanics, fluids, waves, optics, thermodynamics, electromagnetism, atomic and nuclear physics. It includes all seven SI base units through the unit and prefix grammar, all 22 named SI derived units, all 24 SI decimal prefixes, and common additional measurement units. It is extensible rather than a claim that every concept or convention in physics has one universal symbol.

Vector quantities default to arrow notation in the catalog: force, acceleration, velocity, momentum, displacement, torque, angular velocity and acceleration, and the relevant fields and flux densities. There are 32 vector quantity defaults. Speed, angular speed, energy, mass, pressure and electric current are scalar. Literal variable letters retain their existing notation; custom definitions take priority. Explicit “vector” does not add a second arrow to an already-vector quantity. These distinctions follow the scalar/vector conventions in [OpenStax University Physics](https://openstax.org/books/university-physics-volume-1/pages/2-introduction).

Position defaults to $\vec{r}$; displacement is the change in position, $\Delta\vec{r}$. They are separate quantities. In one-dimensional formulas a displacement may be written $\Delta x$, while literal `x` continues to mean the variable entered. See [OpenStax: Displacement and Velocity Vectors](https://openstax.org/books/university-physics-volume-1/pages/4-1-displacement-and-velocity-vectors).

## Readings

- “slope equals change in y over change in x” → m = Δy/Δx

- “velocity equals ten meters per second” → $\vec{v}=10\,\mathrm{m/s}$
- “acceleration equals 9.8 meters per second squared” → $\vec{a}=9.8\,\mathrm{m/s^2}$
- “momentum equals three kilogram meters per second” → $\vec{p}=3\,\mathrm{kg\,m/s}$
- “charge equals five microcoulombs” → q = 5 μC
- “specific heat equals 4200 joules per kilogram kelvin” → c = 4200 J/(kg K)
- “kilogram meters per second squared” → kg m/s²

Complete spelled-out unit expressions also work without a numeric magnitude, using the same product, ratio, prefix and power grammar as measurements.

Scientific magnitudes compose before their units: “1.6 times ten to the power negative nineteen coulombs” and “3e8 joules” attach the unit to the whole value, with a dimensionless exponent.

Names accept US and UK spellings, plurals, non-breaking spaces, square/cubic prefixes, squared/cubed suffixes, and explicit integer powers. Unit products and repeated “per” compose; repeated factors combine into powers. Prefixes attach to unit names, not to other prefixes. Mass prefixes attach to gram, producing kilogram, milligram, etc.

Unit symbols are case sensitive: MW and mW differ. Spelled-out names are case insensitive. A space separates a written numeric value from its unit symbol; attached “2m” retains its existing algebraic product convention. Spoken cardinal coefficients use unit names, avoiding ambiguous single-letter variables. Script arguments retain their algebraic meaning. Quantity symbols are defaults, not universal assignments: pressure is p, momentum is vector p, power is P; use qualified names or a custom dictionary to choose another convention. A bare quantity never acquires an inferred numeric value or an automatically appended unit.

Physics & units is independently enabled and inspectable under built-in notation. Existing settings migrate with this new group enabled while preserving other choices; an earlier All off setting stays off. Forced Text mode and a deliberately rejected Auto line stay literal; custom definitions retain priority. Typing, completed paste, dictation, and selection-replacement previews share the physical grammar. Typing retains source ranges so later words can extend already-rendered notation using the shared parser. All 57 quantity and measurement readings are checked character by character through keyboard and text-service input in Auto and Math, covering products, ratios, powers, prefixes and measurement equations. These checks do not establish speech-recognition accuracy.

## Quantity defaults

| Quantity | Symbol | Usual SI unit |
|---|---|---|
| slope | $m$ | 1 |
| energy, total energy | $E$ | J |
| kinetic energy | $E_k$ | J |
| potential energy | $E_p$ | J |
| mechanical energy | $E_m$ | J |
| work | $W$ | J |
| power | $P$ | W |
| velocity | $\vec{v}$ | m/s |
| speed | $v$ | m/s |
| initial velocity | $\vec{v_0}$ | m/s |
| initial speed | $v_0$ | m/s |
| final velocity | $\vec{v_f}$ | m/s |
| final speed | $v_f$ | m/s |
| acceleration | $\vec{a}$ | m/s^2 |
| jerk | $\vec{j}$ | m/s^3 |
| force, net force | $\vec{F}$ | N |
| weight, gravitational force | $\vec{F_g}$ | N |
| normal force | $\vec{F_N}$ | N |
| frictional force, friction force | $\vec{F_f}$ | N |
| tension | $\vec{T}$ | N |
| spring force | $\vec{F_s}$ | N |
| momentum, linear momentum | $\vec{p}$ | kg m/s |
| impulse | $\vec{J}$ | N s |
| mass | $m$ | kg |
| reduced mass | $\mu$ | kg |
| time, elapsed time | $t$ | s |
| period, orbital period | $T$ | s |
| position | $\vec{r}$ | m |
| displacement | $\Delta \vec{r}$ | m |
| distance, length | $d$ | m |
| height | $h$ | m |
| radius | $r$ | m |
| diameter | $d$ | m |
| area | $A$ | m^2 |
| volume | $V$ | m^3 |
| density, mass density | $\rho$ | kg/m^3 |
| pressure | $p$ | Pa |
| torque, moment of force | $\vec{\tau}$ | N m |
| angular momentum | $\vec{L}$ | kg m^2/s |
| moment of inertia | $I$ | kg m^2 |
| angle, angular displacement | $\theta$ | rad |
| angular velocity | $\vec{\omega}$ | rad/s |
| angular speed, angular frequency | $\omega$ | rad/s |
| angular acceleration | $\vec{\alpha}$ | rad/s^2 |
| spring constant | $k$ | N/m |
| coefficient of friction | $\mu$ | 1 |
| coefficient of static friction | $\mu_s$ | 1 |
| coefficient of kinetic friction | $\mu_k$ | 1 |
| gravitational acceleration, acceleration due to gravity | $\vec{g}$ | m/s^2 |
| gravitational constant | $G$ | N m^2/kg^2 |
| stress | $\sigma$ | Pa |
| strain | $\epsilon$ | 1 |
| young's modulus, youngs modulus | $Y$ | Pa |
| bulk modulus | $B$ | Pa |
| shear modulus | $G$ | Pa |
| dynamic viscosity, viscosity | $\eta$ | Pa s |
| kinematic viscosity | $\nu$ | m^2/s |
| surface tension | $\gamma$ | N/m |
| volume flow rate, volumetric flow rate | $Q$ | m^3/s |
| mass flow rate | $\dot{m}$ | kg/s |
| buoyant force | $\vec{F_b}$ | N |
| frequency | $f$ | Hz |
| wavelength | $\lambda$ | m |
| wave number, wavenumber | $k$ | 1/m |
| amplitude | $A$ | m |
| phase, phase angle | $\phi$ | rad |
| wave speed, speed of sound | $v$ | m/s |
| wave intensity, intensity | $I$ | W/m^2 |
| refractive index, index of refraction | $n$ | 1 |
| focal length | $f$ | m |
| optical power | $P$ | 1/m |
| magnification | $M$ | 1 |
| object distance | $d_o$ | m |
| image distance | $d_i$ | m |
| speed of light | $c$ | m/s |
| luminous intensity | $I_v$ | cd |
| luminous flux | $\Phi_v$ | lm |
| illuminance | $E_v$ | lx |
| luminance | $L_v$ | cd/m^2 |
| solid angle | $\Omega$ | sr |
| temperature, absolute temperature | $T$ | K |
| heat, heat transfer | $Q$ | J |
| internal energy | $U$ | J |
| enthalpy | $H$ | J |
| entropy | $S$ | J/K |
| gibbs free energy | $G$ | J |
| helmholtz free energy | $F$ | J |
| heat capacity | $C$ | J/K |
| specific heat, specific heat capacity | $c$ | J/(kg K) |
| molar heat capacity | $C_m$ | J/(mol K) |
| specific latent heat, latent heat | $L$ | J/kg |
| thermal conductivity | $k$ | W/(m K) |
| thermal diffusivity | $\alpha$ | m^2/s |
| thermal expansion coefficient, coefficient of thermal expansion | $\alpha$ | 1/K |
| heat flux | $\vec{q}$ | W/m^2 |
| thermal resistance | $R$ | K/W |
| amount of substance | $n$ | mol |
| molar mass | $M$ | kg/mol |
| molar volume | $V_m$ | m^3/mol |
| gas constant | $R$ | J/(mol K) |
| boltzmann constant | $k_B$ | J/K |
| efficiency, thermal efficiency | $\eta$ | 1 |
| electric charge, charge | $q$ | C |
| electric current, current | $I$ | A |
| current density | $\vec{J}$ | A/m^2 |
| voltage, electric potential, potential difference | $V$ | V |
| electromotive force | $\epsilon$ | V |
| electric field, electric field strength | $\vec{E}$ | V/m |
| electric flux | $\Phi_E$ | V m |
| electric dipole moment | $\vec{p}$ | C m |
| electric displacement field | $\vec{D}$ | C/m^2 |
| polarization density | $\vec{P}$ | C/m^2 |
| resistance, electrical resistance | $R$ | \Omega |
| resistivity, electrical resistivity | $\rho$ | \Omega m |
| conductance, electrical conductance | $G$ | S |
| conductivity, electrical conductivity | $\sigma$ | S/m |
| capacitance | $C$ | F |
| inductance, self inductance | $L$ | H |
| mutual inductance | $M$ | H |
| impedance | $Z$ | \Omega |
| reactance | $X$ | \Omega |
| admittance | $Y$ | S |
| magnetic field, magnetic flux density | $\vec{B}$ | T |
| magnetic field strength | $\vec{H}$ | A/m |
| magnetic flux | $\Phi_B$ | Wb |
| magnetic dipole moment | $\vec{\mu}$ | A m^2 |
| magnetization | $\vec{M}$ | A/m |
| permittivity | $\epsilon$ | F/m |
| vacuum permittivity | $\epsilon_0$ | F/m |
| permeability | $\mu$ | H/m |
| vacuum permeability | $\mu_0$ | H/m |
| relative permittivity, dielectric constant | $\epsilon_r$ | 1 |
| relative permeability | $\mu_r$ | 1 |
| electric potential energy, electrical energy | $U_e$ | J |
| magnetic energy | $U_B$ | J |
| energy density | $u$ | J/m^3 |
| linear charge density | $\lambda$ | C/m |
| surface charge density | $\sigma$ | C/m^2 |
| volume charge density | $\rho$ | C/m^3 |
| poynting vector | $\vec{S}$ | W/m^2 |
| planck constant | $h$ | J s |
| reduced planck constant | $\hbar$ | J s |
| photon energy | $E$ | J |
| rest energy | $E_0$ | J |
| rest mass | $m_0$ | kg |
| binding energy | $E_b$ | J |
| work function | $\phi$ | J |
| elementary charge | $e$ | C |
| electron mass | $m_e$ | kg |
| proton mass | $m_p$ | kg |
| neutron mass | $m_n$ | kg |
| avogadro constant | $N_A$ | 1/mol |
| particle number, number of particles | $N$ | 1 |
| radioactive activity | $A$ | Bq |
| decay constant | $\lambda$ | 1/s |
| half life, half-life | $t_{1/2}$ | s |
| absorbed dose | $D$ | Gy |
| equivalent dose, dose equivalent | $H$ | Sv |
| catalytic activity | $z$ | kat |
| cross section | $\sigma$ | m^2 |
| probability density | $\rho$ | 1/m^3 |

## Unit names

| Name and aliases | Symbol |
|---|---|
| meter, meters, metre, metres | $m$ |
| gram, grams | $g$ |
| second, seconds | $s$ |
| ampere, amperes, amp, amps | $A$ |
| kelvin, kelvins | $K$ |
| mole, moles | $mol$ |
| candela, candelas | $cd$ |
| radian, radians | $rad$ |
| steradian, steradians | $sr$ |
| hertz | $Hz$ |
| newton, newtons | $N$ |
| pascal, pascals | $Pa$ |
| joule, joules | $J$ |
| watt, watts | $W$ |
| coulomb, coulombs | $C$ |
| volt, volts | $V$ |
| farad, farads | $F$ |
| ohm, ohms | $\Omega$ |
| siemens | $S$ |
| weber, webers | $Wb$ |
| tesla, teslas | $T$ |
| henry, henries | $H$ |
| lumen, lumens | $lm$ |
| lux | $lx$ |
| becquerel, becquerels | $Bq$ |
| gray, grays | $Gy$ |
| sievert, sieverts | $Sv$ |
| katal, katals | $kat$ |
| degree celsius, degrees celsius | ${}^\circ\mathrm{C}$ |
| liter, liters, litre, litres | $L$ |
| minute, minutes | $min$ |
| hour, hours | $h$ |
| day, days | $d$ |
| tonne, tonnes | $t$ |
| electron volt, electron volts, electronvolt, electronvolts | $eV$ |
| dalton, daltons | $Da$ |
| atomic mass unit, atomic mass units | $u$ |
| hectare, hectares | $ha$ |
| degree, degrees | ${}^\circ$ |
| bar, bars | $bar$ |
| atmosphere, atmospheres | $atm$ |
| millimeter of mercury, millimeters of mercury, millimetre of mercury, millimetres of mercury | $\mathrm{mmHg}$ |
| angstrom, angstroms | $\mathring{\mathrm{A}}$ |
| degree fahrenheit, degrees fahrenheit | ${}^\circ\mathrm{F}$ |
| inch, inches | $in$ |
| foot, feet | $ft$ |
| yard, yards | $yd$ |
| mile, miles | $mi$ |
| pound, pounds | $lb$ |
| ounce, ounces | $oz$ |

## Sources and validation

- [BIPM SI Brochure](https://www.bipm.org/documents/20126/41483022/SI-Brochure-9-EN.pdf): SI units, prefixes and conventions.
- [NIST SI units and prefixes](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-4-two-classes-si-units-and-si-prefixes): base and derived units.
- [NIST unit typography](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-6-rules-and-style-conventions-printing-and-using): upright symbols and case.
- [OpenStax physics units](https://openstax.org/books/university-physics-volume-2/pages/a-units): common quantity symbols and units.

Tests compare independently written measurement readings against expected mathematical structures, validate the catalog and prefix output, preserve prose and algebra regressions, and exercise editable paste/dictation with Undo and Redo. Catalog enumeration validates coverage and syntax; it is not independent evidence for every conventional symbol choice. No audio is recorded and no recognition-accuracy claim is made.
