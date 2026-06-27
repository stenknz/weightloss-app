// Generate 6 months of test data for a review user
// Run: node scripts/seed-test-data.js
// Requires dev server running on http://localhost:3886

const BASE = 'http://localhost:3886';

async function main() {
  // Step 1: Register the test user
  console.log('Registering test user...');
  const registerRes = await fetch(BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@local.dev',
      password: 'test-password-456',
      invite_code: 'DEVV'
    })
  });
  const reg = await registerRes.json();
  if (!registerRes.ok) {
    if (reg.error && reg.error.includes('exists')) {
      console.log('User already exists, logging in...');
    } else {
      console.error('Register failed:', reg);
      return;
    }
  } else {
    console.log('Registered:', reg.user.email);
  }

  // Step 2: Login to get cookies + CSRF
  console.log('Logging in...');
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@local.dev', password: 'test-password-456' })
  });
  const login = await loginRes.json();
  if (!loginRes.ok) { console.error('Login failed:', login); return; }

  // Extract cookies from response headers
  const setCookie = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  var sessionCookie = '';
  var csrfToken = '';
  for (var ci = 0; ci < setCookie.length; ci++) {
    var c = setCookie[ci];
    if (c.startsWith('weightloss_session=')) sessionCookie = c.split(';')[0];
    if (c.startsWith('weightloss_csrf=')) csrfToken = c.split(';')[0].replace('weightloss_csrf=', '');
  }
  var cookie = [sessionCookie, 'weightloss_csrf=' + csrfToken].join('; ');
  var cToken = csrfToken;

  function makeHeaders() {
    return { 'content-type': 'application/json', cookie: cookie, 'x-csrf-token': cToken };
  }

  async function api(method, path, body) {
    var opts = { method: method, headers: makeHeaders() };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(BASE + path, opts);
    var data = await res.json();
    if (!res.ok) console.error('  ' + method + ' ' + path + ':', data.error || res.status);
    return data;
  }

  // Step 3: Update profile
  console.log('Setting profile...');
  await api('PUT', '/api/profile', {
    name: 'Test User', sex: 'male', age: 35, height_cm: 178,
    activity_level: 'moderate', target_weight_kg: 90
  });

  // Step 4: Set goals
  console.log('Setting goals...');
  await api('PUT', '/api/goals', {
    target_weight_kg: 90, target_calorie_deficit: 500,
    target_date: '2026-06-30',
    calorie_target: 2000, protein_target_g: 160,
    carbs_target_g: 200, fat_target_g: 65
  });

  // Step 5: Generate 26 weeks of data
  var startDate = new Date('2026-01-05'); // Start on a Monday
  var endDate = new Date('2026-06-28');

  console.log('Generating 26 weeks of data...');

  var weekCount = 26;
  var startWeight = 115;
  var endWeight = 94;
  var weeklyDrop = (startWeight - endWeight) / weekCount;

  // Measurements: 7 monthly points
  var measureDates = [];
  for (var m = 0; m <= 6; m++) {
    var d = new Date(startDate);
    d.setDate(1);
    d.setMonth(d.getMonth() + m);
    if (d <= endDate) measureDates.push(d);
  }

  function fmt(d) {
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + day;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.round(rand(min, max)); }

  var foodDescs = [
    'Oatmeal with berries and nuts', 'Greek yogurt with honey',
    'Scrambled eggs with spinach', 'Protein smoothie',
    'Grilled chicken salad', 'Tuna wrap with veggies',
    'Turkey sandwich on whole wheat', 'Quinoa bowl with roasted veg',
    'Salmon with rice and broccoli', 'Lean steak with sweet potato',
    'Chicken stir-fry', 'Pasta with marinara and turkey meatballs',
    'Apple with almond butter', 'Mixed nuts', 'Protein bar',
    'Hummus with carrot sticks'
  ];

  var weekNotes = [
    function(w) { return 'Week ' + (w + 1) + ': Good consistency this week. Weight is trending down at ' + Math.abs(weeklyDrop).toFixed(1) + ' kg/week average. Feeling motivated.'; },
    function(w) { return 'Week ' + (w + 1) + ': Had a few social events but stayed reasonable. Learning to make better choices when eating out.'; },
    function(w) { return 'Week ' + (w + 1) + ': Energy levels are up. Sleep quality has improved since starting this. Down another ' + Math.abs(weeklyDrop).toFixed(1) + ' kg.'; },
    function(w) { return 'Week ' + (w + 1) + ': Tough week at work but didn\'t fall off track completely. Progress > perfection.'; },
    function(w) { return 'Week ' + (w + 1) + ': Starting to notice clothes fitting differently. Belt went down a notch. Great motivation to keep going.'; },
    function(w) { return 'Week ' + (w + 1) + ': Increased protein intake this week and feeling more satisfied after meals. Strength at the gym is improving.'; },
    function(w) { return 'Week ' + (w + 1) + ': Clean eating all week. No takeaways. Water intake consistent at ~2L/day. This is becoming routine.'; }
  ];

  var weighNotes = [
    'Starting point', 'Early progress', 'Consistent drop',
    'Slight bump, staying consistent', 'Good week', 'Plateau week',
    'Back on track', 'Feeling strong', 'New low!', 'Almost at target!'
  ];

  // Process weeks
  for (var w = 0; w < weekCount; w++) {
    var weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);
    if (weekStart > new Date()) break;

    // Weekly weigh-in
    var weight = +(startWeight - weeklyDrop * w + rand(-0.4, 0.4)).toFixed(1);
    var weighDate = new Date(weekStart);
    weighDate.setDate(weighDate.getDate() + randInt(0, 2));

    if (weighDate <= new Date()) {
      var note = null;
      if (w === 0) note = 'Starting point (' + weight + ' kg)';
      else if (w === weekCount - 1) note = 'Almost at target!';
      else if (Math.random() > 0.7) note = weighNotes[randInt(0, weighNotes.length - 1)];
      await api('POST', '/api/weigh-ins', {
        entry_date: fmt(weighDate), weight_kg: weight, note: note
      });
    }

    // 7 days of daily data per week
    for (var day = 0; day < 7; day++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + day);
      if (d > new Date()) break;
      var ds = fmt(d);
      var isWeekend = d.getDay() === 0 || d.getDay() === 6;

      // Food logs (2-4 meals per day)
      var mealCount = randInt(2, 4);
      var dailyCal = randInt(1700, 2300);

      for (var mealIdx = 0; mealIdx < mealCount; mealIdx++) {
        var meal = ['breakfast', 'lunch', 'dinner', 'snack'][Math.min(mealIdx, 3)];
        var cal = mealIdx < mealCount - 1
          ? Math.round(dailyCal / mealCount * rand(0.7, 1.3))
          : Math.round(dailyCal / mealCount * rand(0.3, 0.6));
        await api('POST', '/api/food', {
          entry_date: ds, meal: meal,
          description: foodDescs[randInt(0, foodDescs.length - 1)],
          calories: cal,
          protein_g: Math.round(cal * 0.3 / 4),
          carbs_g:   Math.round(cal * 0.4 / 4),
          fat_g:     Math.round(cal * 0.3 / 9),
          fibre_g:   Math.round(rand(5, 30) * 10) / 10,
          sugar_g:   Math.round(rand(5, 40) * 10) / 10
        });
      }

      // Exercise (3-5 times per week, more on weekends)
      if (Math.random() < (isWeekend ? 0.7 : 0.4)) {
        var isCardio = Math.random() > 0.5;
        await api('POST', '/api/exercise', {
          entry_date: ds,
          activity: isCardio
            ? ['Walking', 'Jogging', 'Cycling', 'Swimming'][randInt(0, 3)]
            : ['Weight training', 'Bodyweight circuit', 'Yoga', 'HIIT'][randInt(0, 3)],
          duration_min: randInt(20, 60),
          calories_burned: Math.round(rand(150, 500)),
          notes: null
        });
      }

      // Water (several entries per day, total 1.5-3L)
      var totalWater = randInt(1500, 3000);
      var servings = randInt(3, 6);
      for (var s = 0; s < servings; s++) {
        await api('POST', '/api/water', {
          entry_date: ds,
          amount_ml: Math.round(totalWater / servings)
        });
      }

      // Steps (5k-15k per day)
      await api('POST', '/api/steps', {
        entry_date: ds,
        steps: randInt(5000, isWeekend ? 15000 : 12000)
      });
    }

    // Weekly note
    var noteDate = new Date(weekStart);
    noteDate.setDate(noteDate.getDate() + 6);
    if (noteDate <= new Date()) {
      await api('POST', '/api/notes', {
        entry_date: fmt(noteDate),
        body: weekNotes[w % 7](w)
      });
    }

    if (w % 5 === 0) console.log('  Week ' + (w + 1) + '/' + weekCount + ' done...');
  }

  // Monthly measurements
  for (var mi = 0; mi < measureDates.length; mi++) {
    var md = measureDates[mi];
    if (md > new Date()) break;
    var progress = Math.min(1, Math.max(0, (md.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())));
    var waist  = +(112 - progress * 17 + rand(-1, 1)).toFixed(1);
    var chest  = +(120 - progress * 12 + rand(-0.5, 0.5)).toFixed(1);
    var hips   = +(108 - progress * 12 + rand(-1, 1)).toFixed(1);
    var thigh  = +(64 - progress * 9  + rand(-0.5, 0.5)).toFixed(1);
    var arm    = +(39 - progress * 4  + rand(-0.3, 0.3)).toFixed(1);
    await api('POST', '/api/measurements', {
      entry_date: fmt(md), waist_cm: waist, chest_cm: chest,
      hips_cm: hips, thigh_cm: thigh, arm_cm: arm
    });
  }

  console.log('');
  console.log('Done! Test data generated successfully.');
  console.log('Login at http://localhost:3886 with test@local.dev / test-password-456');
}

main().catch(function(e) { console.error(e); });
