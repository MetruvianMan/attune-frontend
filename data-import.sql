-- Attune Data Import SQL
-- Generated from backup file
-- Run this in Supabase SQL Editor

-- Child Profiles
INSERT INTO child_profiles (id, display_name, alias, age, diagnosis, intake_profile, created_at, updated_at) VALUES (
  'profile-1780169301356',
  'Robbie',
  NULL,
  7,
  'Autism, ADHD',
  '{"biographical":{"grade":"1st grade"},"traits":["Artistic","imaginative"],"strengths":["Creative","athletic","clever"],"struggles":["Transitions","self-regulation"],"sensoryPreferences":{"sensitivities":["Coarse fabrics","loud noises"],"seekingBehaviors":[]},"communicationStyle":{"type":"verbal","preferredPatterns":[]}}'::jsonb,
  1780169301356,
  1780294843891
) ON CONFLICT (id) DO NOTHING;

-- Events (first 50)
INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'ad11a89e-498f-429f-9ebf-e311c55f64f5',
  'profile-1780169301356',
  'medication',
  1780379058732,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Medication Given',
  NULL,
  NULL,
  '[]'::jsonb,
  0,
  1780379058733,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'b71f4718-2050-4aff-9472-90a02c1da2b6',
  'profile-1780169301356',
  'poor_sleep',
  1780426800000,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Poor Sleep',
  NULL,
  NULL,
  '[]'::jsonb,
  0,
  1780726174355,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '3f5187a1-1635-487e-89f2-c17d2265078c',
  'profile-1780169301356',
  'family_adventure',
  1780513200000,
  NULL,
  '[]'::jsonb,
  'Robbie went to the zoo on a field trip and had a lot of fun.',
  '[]'::jsonb,
  'voice',
  'Robbie went to the zoo on a field trip and had a lot of fun. He had a nice dinner of salad and a hot dog and pushed his sister on the swing after dinner. He had his medicine before bed.',
  NULL,
  NULL,
  'positive',
  '[]'::jsonb,
  0,
  1780710076711,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'fb6e89bb-3f60-4b0e-a461-26611fabf623',
  'profile-1780169301356',
  'school_incident',
  1780723452298,
  NULL,
  '[]'::jsonb,
  'Misbehaved with his friend Albie and clogged a toilet at school.',
  '[]'::jsonb,
  'voice',
  'Robbie had a rough day. He had a number of different school incidents during and after a field trip. He was misbehaving with his friend, Albie. They purposefully clogged a toilet at the school and then had to apologize to the custodian. When mom picked him up after school, Robbie threw a tantrum and intentionally peed himself, and daddy had to come to school with new clothes so they could leave together and Robbie could get in the car. This made mom really upset and she got a migraine. Robbie was much better in the evening. He ate his dinner, was well behaved around his siblings, and got to watch TV for the last hour or so before bed. He went down rather easily with Andy sleeping in the same room.',
  NULL,
  '🚽',
  'negative',
  '[]'::jsonb,
  0,
  1780723452387,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '760f947f-6a1d-4142-aff5-fe3fb56475a0',
  'profile-1780169301356',
  'naughty',
  1780807599983,
  NULL,
  '[]'::jsonb,
  'Denied making a mess in playroom',
  '[]'::jsonb,
  'voice',
  'Today was yet another tough day, Robbie was okay in the morning when a babysitter came over until 2pm, however at about noon, Robbie was asked to clean up a space in the playroom that was messy and he denied making the mess even though I had seen him make it. When I insisted that he clean up, he got really upset, threw his fire truck, hit Andy on the way out of the room, and went upstairs as part of a meltdown. He wouldn''t talk to me when I went up to his room about a half hour later and he made a big mess in his room which I had to clean later in the day. Then we all went to Michaels to get art supplies for a family craft night and Robbie was excited throughout the shopping experience but got very upset at the end when we wouldn''t buy him a stuffed octopus and he cried. We went home and did some crafts and he was better but then around dinner time he was using potty language and we didn''t allow him to have a second helping of bread and butter so he threw a lego creation across the room and yet again went up to his room after a meltdown. He bounced back after that and had a quiet evening but it was overall a fairly trying day.',
  NULL,
  '😈',
  'negative',
  '[]'::jsonb,
  0,
  1780807600073,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '225bd1d1-6564-4150-8d60-df85e695cb8f',
  'profile-1780169301356',
  'great_day',
  1781071166292,
  NULL,
  '[]'::jsonb,
  'Had a really good day',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He was extremely well behaved in the evening. He read really quietly. He had a decent dinner. He had gone earlier in the day after school to an ice cream social with Mom and had really wanted to play with his friend, Allie, but the two of them have had to be separated recently because they''ve been naughty at times. So Robbie played baseball outside with Dad as a Dad bonding moment and he went to bed in the same room as his brother. He had his medicine before bed. All in all, a very controlled and regulated day.',
  NULL,
  '🐦‍🔥',
  'positive',
  '[]'::jsonb,
  0,
  1781071166376,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'f8a09a32-add5-474c-91e8-c8cd1db397e0',
  'profile-1780169301356',
  'great_day',
  1781155856600,
  NULL,
  '[]'::jsonb,
  'Had a good day',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day on the day that saw his mom leave town for a girl''s trip. He was well behaved in the morning and got dressed and left the house without much fuss. He was picked up from school by Karen for a play date and he hung out with her for a little while before asking to go home. He was very chill and docile throughout the evening. He ate a good dinner of steak and he had good manners and cleaned up after himself. He was mild mannered with his siblings. Robbie received a couple of reward toys consistent with a deal he had with his mom where good behavior would lead to these rewards. Robbie and his siblings were good enough to earn TV time in the evening and Robbie went down for bed fairly easily, although he did get up at one point to change his clothes. He took his medicine.',
  NULL,
  '🌟',
  'positive',
  '[]'::jsonb,
  0,
  1781155856694,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'd689a15c-ec5b-409e-9ea2-837161c0705e',
  'profile-1780169301356',
  'video_games',
  1781240356304,
  NULL,
  '[]'::jsonb,
  'Played video games with teacher (Mr. Nick)',
  '[]'::jsonb,
  'voice',
  'Another day with mom out of town. Robbie seemed relatively easy in the morning. I didn''t receive any negative reports about him while he was at school. He stayed a couple hours afterwards to play video games with his teacher, Mr. Nick, which is a prize he won at a silent auction a month ago. Robbie stayed at school even longer with our nanny, Zion, and his siblings to play on the school playground. Dad joined them there and played with them before driving them home to eat dinner. They all ate well and Robbie had dessert afterwards. He volunteered to take a bath and the kids earned a program afterwards and watched TV. Robbie was a little bit difficult at bedtime and got out of his bed several times but ultimately fell asleep. He took his medicine.',
  NULL,
  '🎮',
  'neutral',
  '[]'::jsonb,
  0,
  1781240356400,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'ee0b62d0-556e-4acb-b831-0fbdfc2036a7',
  'profile-1780169301356',
  'parent_out_of_town',
  1781290800000,
  NULL,
  '[]'::jsonb,
  'Mom in South Carolina',
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Parent(s) Away',
  NULL,
  NULL,
  '[]'::jsonb,
  0,
  1781420836047,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '28e9074a-16c7-4fe3-a4e3-0abdd00b2998',
  'profile-1780169301356',
  'parent_out_of_town',
  1781419993112,
  NULL,
  '[]'::jsonb,
  'Mom in South Carolina',
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Parent(s) Away',
  NULL,
  NULL,
  '[]'::jsonb,
  0,
  1781419993112,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '9350b0e2-2af1-495b-9f24-222b41779e51',
  'profile-1780169301356',
  'good_sleep',
  1781495798978,
  NULL,
  '[]'::jsonb,
  'Slept in until 8am',
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Good Sleep',
  NULL,
  NULL,
  '[]'::jsonb,
  0,
  1781495798979,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '4bb10a7f-d71d-4b9b-b6d1-45952de6e200',
  'profile-1780169301356',
  'overwhelm',
  1781636400000,
  NULL,
  '[]'::jsonb,
  'Felt sad about broken friendship',
  '[]'::jsonb,
  'voice',
  'Robbie had a fairly uneventful day. He drew comics after school, ate a good dinner and played nicely with his siblings. He went to bed without any fuss and took his medicine before bed. He was sad throughout the day about his broken friendship with Albie, but was encouragingly open about his emotions with mom and dad. He made an impressive lock structure with his Matchbox cars.',
  NULL,
  '😢',
  'negative',
  '[]'::jsonb,
  0,
  1781756594992,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '1d27b20c-3b31-48f0-9bb7-fe6d97218825',
  'profile-1780169301356',
  'custom',
  1781757072420,
  NULL,
  '[]'::jsonb,
  'Robbie was still heartbroken about his fractured friendship with Albie',
  '[]'::jsonb,
  'custom',
  NULL,
  'Sad',
  '😞',
  'neutral',
  '[]'::jsonb,
  0,
  1781757072420,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '6f5e7faa-86be-49d7-9b52-6fb8ee039807',
  'profile-1780169301356',
  'great_day',
  1781809200000,
  NULL,
  '[]'::jsonb,
  'Woke up in a good mood',
  '[]'::jsonb,
  'voice',
  'It was the first official day of summer, Robbie woke up in a good mood and played wonderfully with his nanny, Hyanna, and Andy. He did a choreographed dance with Hyanna that he wanted to show mom. He built an incredibly complex avocado land with Andy involving multiple surfaces and toys and then had Hyanna record a 10 minute video explaining all the creative secret passageways, helicopter pads, etc. of his creation. He also cleaned it up with her help without much prompting. Robbie went across the street to his neighbor''s house and played well with Jasper and Kai and Griffin in his basement with limited expected drama. He was in good spirits and ate well, lots of cookies but also other things, all day.',
  NULL,
  '🌟',
  'positive',
  '[]'::jsonb,
  0,
  1781931282732,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '55e195b1-1e92-43cc-8009-e4982ed325a1',
  'profile-1780169301356',
  'stayed_home',
  1781930549768,
  NULL,
  '[]'::jsonb,
  'Stayed at home with the nanny',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He stayed at home with the nanny, Rayanna, in the morning and was generally well behaved. He did a lot of pretend play while he dressed up as a king and pretended that Andy was his butler. He used cushions from the couch to build a throne in Castle Keep and surprised us all by cleaning it up after he was done playing. We went on a family adventure to Discovery Park in the afternoon and after a couple of hours we all went to Wendy''s to get fast food. Robbie was pleasant in the car on the ride home and was rewarded with a movie before bed. He took his medicine before going to sleep.',
  NULL,
  '🏠',
  'neutral',
  '[]'::jsonb,
  0,
  1781930549858,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'c1ad174d-d759-4f76-bd3f-a1989dbf119d',
  'profile-1780169301356',
  'wet_bed',
  1780379061782,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Wet Bed',
  NULL,
  NULL,
  '[]'::jsonb,
  1,
  1780379061783,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'fa6d5793-4108-43a5-9d40-03dade829bdf',
  'profile-1780169301356',
  'meltdown',
  1780426800000,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Meltdown',
  NULL,
  NULL,
  '[]'::jsonb,
  1,
  1780726168449,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '73fb1bd8-7ef2-474f-adbd-2619744cfccd',
  'profile-1780169301356',
  'school_incident',
  1780513200000,
  NULL,
  '[]'::jsonb,
  'Robby was taken to the principal''s office',
  '[]'::jsonb,
  'voice',
  'Robby got into a fight at school and was taken to the principal''s office. We were given a call by the principal afterwards and had a talk with Robby about the incident when we were having dinner.',
  NULL,
  NULL,
  'negative',
  '[]'::jsonb,
  1,
  1780710228236,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '94b638e3-02d1-4175-9f24-a8e1ac81b786',
  'profile-1780169301356',
  'helpful',
  1780599600000,
  NULL,
  '[]'::jsonb,
  'Got dressed on his own.',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day, he went to school, got dressed on his own, then when he came home he played soccer with dad and built blocks with his brother Andy. He cleaned up his room before going to bed and took his medicine.',
  NULL,
  NULL,
  'positive',
  '[]'::jsonb,
  1,
  1780708957383,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '0c6f9b83-75c4-47f6-8155-cc62f16fdb91',
  'profile-1780169301356',
  'meltdown',
  1780723452298,
  NULL,
  '[]'::jsonb,
  'Robbie threw a tantrum when mom picked him up from school.',
  '[]'::jsonb,
  'voice',
  'Robbie had a rough day. He had a number of different school incidents during and after a field trip. He was misbehaving with his friend, Albie. They purposefully clogged a toilet at the school and then had to apologize to the custodian. When mom picked him up after school, Robbie threw a tantrum and intentionally peed himself, and daddy had to come to school with new clothes so they could leave together and Robbie could get in the car. This made mom really upset and she got a migraine. Robbie was much better in the evening. He ate his dinner, was well behaved around his siblings, and got to watch TV for the last hour or so before bed. He went down rather easily with Andy sleeping in the same room.',
  NULL,
  '😡',
  'negative',
  '[]'::jsonb,
  1,
  1780723452388,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '68e6be21-1227-4d6a-bd7d-99aba1948de7',
  'profile-1780169301356',
  'meltdown',
  1780807599983,
  NULL,
  '[]'::jsonb,
  'Threw fire truck during meltdown',
  '[]'::jsonb,
  'voice',
  'Today was yet another tough day, Robbie was okay in the morning when a babysitter came over until 2pm, however at about noon, Robbie was asked to clean up a space in the playroom that was messy and he denied making the mess even though I had seen him make it. When I insisted that he clean up, he got really upset, threw his fire truck, hit Andy on the way out of the room, and went upstairs as part of a meltdown. He wouldn''t talk to me when I went up to his room about a half hour later and he made a big mess in his room which I had to clean later in the day. Then we all went to Michaels to get art supplies for a family craft night and Robbie was excited throughout the shopping experience but got very upset at the end when we wouldn''t buy him a stuffed octopus and he cried. We went home and did some crafts and he was better but then around dinner time he was using potty language and we didn''t allow him to have a second helping of bread and butter so he threw a lego creation across the room and yet again went up to his room after a meltdown. He bounced back after that and had a quiet evening but it was overall a fairly trying day.',
  NULL,
  '🌊',
  'negative',
  '[]'::jsonb,
  1,
  1780807600075,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'e0c48db0-1a64-468e-8949-5b427233ae58',
  'profile-1780169301356',
  'mom_bonding',
  1781071166292,
  NULL,
  '[]'::jsonb,
  'Went to ice cream social with Mom',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He was extremely well behaved in the evening. He read really quietly. He had a decent dinner. He had gone earlier in the day after school to an ice cream social with Mom and had really wanted to play with his friend, Allie, but the two of them have had to be separated recently because they''ve been naughty at times. So Robbie played baseball outside with Dad as a Dad bonding moment and he went to bed in the same room as his brother. He had his medicine before bed. All in all, a very controlled and regulated day.',
  NULL,
  '👩',
  'positive',
  '[]'::jsonb,
  1,
  1781071166379,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '40ec2174-2e5c-4cf2-85d2-1f73cbfe60dc',
  'profile-1780169301356',
  'playdate',
  1781155856600,
  NULL,
  '[]'::jsonb,
  'Hung out with Karen',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day on the day that saw his mom leave town for a girl''s trip. He was well behaved in the morning and got dressed and left the house without much fuss. He was picked up from school by Karen for a play date and he hung out with her for a little while before asking to go home. He was very chill and docile throughout the evening. He ate a good dinner of steak and he had good manners and cleaned up after himself. He was mild mannered with his siblings. Robbie received a couple of reward toys consistent with a deal he had with his mom where good behavior would lead to these rewards. Robbie and his siblings were good enough to earn TV time in the evening and Robbie went down for bed fairly easily, although he did get up at one point to change his clothes. He took his medicine.',
  NULL,
  '👫',
  'neutral',
  '[]'::jsonb,
  1,
  1781155856695,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'e8fddcbb-ef91-42a3-9c6b-6c1cee4abce9',
  'profile-1780169301356',
  'played_outside',
  1781240356304,
  NULL,
  '[]'::jsonb,
  'Played on the school playground',
  '[]'::jsonb,
  'voice',
  'Another day with mom out of town. Robbie seemed relatively easy in the morning. I didn''t receive any negative reports about him while he was at school. He stayed a couple hours afterwards to play video games with his teacher, Mr. Nick, which is a prize he won at a silent auction a month ago. Robbie stayed at school even longer with our nanny, Zion, and his siblings to play on the school playground. Dad joined them there and played with them before driving them home to eat dinner. They all ate well and Robbie had dessert afterwards. He volunteered to take a bath and the kids earned a program afterwards and watched TV. Robbie was a little bit difficult at bedtime and got out of his bed several times but ultimately fell asleep. He took his medicine.',
  NULL,
  '🌳',
  'positive',
  '[]'::jsonb,
  1,
  1781240356402,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '44f8a170-01a4-41f4-88cf-6959d2f7f8be',
  'profile-1780169301356',
  'family_adventure',
  1781290800000,
  NULL,
  '[]'::jsonb,
  'Andy’s graduation ceremony at Ella Bailey',
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Family Adventure',
  NULL,
  NULL,
  '[]'::jsonb,
  1,
  1781420812521,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '34391eb1-7d18-4306-bbfe-50e457e1001e',
  'profile-1780169301356',
  'stayed_home',
  1781495794604,
  NULL,
  '[]'::jsonb,
  'Stayed home with babysitter',
  '[]'::jsonb,
  'voice',
  'Robbie slept in in the morning and came downstairs around 8 a.m. He stayed home with the babysitter Ella and was fine until mid-morning. When dad returned home from the grocery store with Daisy, Andy and Robbie were watching TV. Robbie was asked to stop watching and clean before resuming his program and he became resistant and then angry before having a meltdown and shutting down in his room. He threw things and was generally incensed. He bounced back but it was a frustrating episode that was partly the fault of the babysitter for letting him watch TV to begin with. We picked up mom from the airport at 4 p.m. as a family and Robbie was pleasant through bedtime. He drew comics and was very proud of them when explaining them to mom. He took his two milligrams of guanfacin before sleep.',
  NULL,
  '🏠',
  'neutral',
  '[]'::jsonb,
  1,
  1781495794697,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '87f7ebd3-15e8-44fd-93b8-1475f3268e63',
  'profile-1780169301356',
  'positive_behavior',
  1781636400000,
  NULL,
  '[]'::jsonb,
  'Was open about his emotions re: Albie with parents',
  '[]'::jsonb,
  'voice',
  'Robbie had a fairly uneventful day. He drew comics after school, ate a good dinner and played nicely with his siblings. He went to bed without any fuss and took his medicine before bed. He was sad throughout the day about his broken friendship with Albie, but was encouragingly open about his emotions with mom and dad. He made an impressive lock structure with his Matchbox cars.',
  NULL,
  '🌟',
  'positive',
  '[]'::jsonb,
  1,
  1781756594993,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '988c3c4b-f246-4f07-a388-96798913c065',
  'profile-1780169301356',
  'shutdown',
  1781756264543,
  NULL,
  '[]'::jsonb,
  'Shut down and cried at pickup',
  '[]'::jsonb,
  'voice',
  'Robbie went to his last day of first grade today. I am unsure how it went during the day, but at pickup he was despondent and unable to attend the end of year party because of his sadness that he was not going to be able to play with Albie. He wanted to go only if he could play with his friend. I told him, unfortunately, that he couldn''t. He began to cry and said, get me out of here. So I took him home. I offered multiple alternatives like different restaurants or activities, but he was in shutdown and very sad. His lips were quivering. And then we ran into his friend, Gus, who is a year older and was with his mom on the front steps. And I said in a panic, Gus, would you like to join us for a play date? And Robbie, I checked with Robbie and Robbie said, okay. And Gus said, okay. So Gus came to our house and Gus played more with me than with Robbie. Robbie tried to engage him, but Robbie was laughing inappropriately and had strange social skills. Robbie peed his pants three times with Gus here, which Gus thought was strange. Gus asked for help with Robbie because Robbie was being weird. Robbie''s feelings were hurt because Gus didn''t pitch a baseball correctly at him. He got angry and hid in his room a couple of times. He was upset because Daisy was physically aggressive with him. And finally, Gus just wanted to leave. And so it was an unsuccessful play date in general, but Robbie was giddy for some of it and laughing, but he just didn''t have very good social skills and it was kind of awkward. Then we ended up having another family over for dinner that had kids and Robbie played very well with the 10-year-old boy, whose name is Thompson. And they played with pranks and Robbie ate a good dinner and was patient about waiting his turn to get on the back of the electrical bike. And even allowed Daisy to sit on his lap for the ride, but he got very tired and wanted to come home and went to bed earlier than normal. And it''s the beginning of summer.',
  NULL,
  '🔇',
  'negative',
  '[]'::jsonb,
  1,
  1781756264644,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '6a2bb474-13af-4d44-a1e2-bca54f1419af',
  'profile-1780169301356',
  'playdate',
  1781809200000,
  NULL,
  '[]'::jsonb,
  'Played with nanny and Andy',
  '[]'::jsonb,
  'voice',
  'It was the first official day of summer, Robbie woke up in a good mood and played wonderfully with his nanny, Hyanna, and Andy. He did a choreographed dance with Hyanna that he wanted to show mom. He built an incredibly complex avocado land with Andy involving multiple surfaces and toys and then had Hyanna record a 10 minute video explaining all the creative secret passageways, helicopter pads, etc. of his creation. He also cleaned it up with her help without much prompting. Robbie went across the street to his neighbor''s house and played well with Jasper and Kai and Griffin in his basement with limited expected drama. He was in good spirits and ate well, lots of cookies but also other things, all day.',
  NULL,
  '👫',
  'positive',
  '[]'::jsonb,
  1,
  1781931282733,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'ec0cbd0e-588b-4a10-b716-9ccf439cb4b8',
  'profile-1780169301356',
  'playdate',
  1781930549768,
  NULL,
  '[]'::jsonb,
  'Did pretend play as a king',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He stayed at home with the nanny, Rayanna, in the morning and was generally well behaved. He did a lot of pretend play while he dressed up as a king and pretended that Andy was his butler. He used cushions from the couch to build a throne in Castle Keep and surprised us all by cleaning it up after he was done playing. We went on a family adventure to Discovery Park in the afternoon and after a couple of hours we all went to Wendy''s to get fast food. Robbie was pleasant in the car on the ride home and was rewarded with a movie before bed. He took his medicine before going to sleep.',
  NULL,
  '👫',
  'positive',
  '[]'::jsonb,
  1,
  1781930549864,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'b108ab90-2e37-4e25-801f-2fc489bb1ba1',
  'profile-1780169301356',
  'good_sleep',
  1780379049631,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Good Sleep',
  NULL,
  NULL,
  '[]'::jsonb,
  2,
  1780379049634,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'c6b7ed3f-03d2-4d56-830e-120711087b63',
  'profile-1780169301356',
  'shutdown',
  1780426800000,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Shutdown',
  NULL,
  NULL,
  '[]'::jsonb,
  2,
  1780726170036,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '4661da75-4c33-4224-a9da-e54323b91b4c',
  'profile-1780169301356',
  'conflict',
  1780513200000,
  NULL,
  '[]'::jsonb,
  'Robby got into a fight at school',
  '[]'::jsonb,
  'voice',
  'Robby got into a fight at school and was taken to the principal''s office. We were given a call by the principal afterwards and had a talk with Robby about the incident when we were having dinner.',
  NULL,
  NULL,
  'negative',
  '[]'::jsonb,
  2,
  1780710228235,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'f0864973-bdc6-46aa-b344-8af954ae2e9d',
  'profile-1780169301356',
  'dad_bonding',
  1780599600000,
  NULL,
  '[]'::jsonb,
  'Played soccer with dad.',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day, he went to school, got dressed on his own, then when he came home he played soccer with dad and built blocks with his brother Andy. He cleaned up his room before going to bed and took his medicine.',
  NULL,
  NULL,
  'positive',
  '[]'::jsonb,
  2,
  1780708957384,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '6d87375f-990b-4cba-ad8d-d3d553da0450',
  'profile-1780169301356',
  'toilet_issue',
  1780723452298,
  NULL,
  '[]'::jsonb,
  'Peed himself during the tantrum.',
  '[]'::jsonb,
  'voice',
  'Robbie had a rough day. He had a number of different school incidents during and after a field trip. He was misbehaving with his friend, Albie. They purposefully clogged a toilet at the school and then had to apologize to the custodian. When mom picked him up after school, Robbie threw a tantrum and intentionally peed himself, and daddy had to come to school with new clothes so they could leave together and Robbie could get in the car. This made mom really upset and she got a migraine. Robbie was much better in the evening. He ate his dinner, was well behaved around his siblings, and got to watch TV for the last hour or so before bed. He went down rather easily with Andy sleeping in the same room.',
  NULL,
  '💧',
  'negative',
  '[]'::jsonb,
  2,
  1780723452389,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '081a9d87-1ec6-4fa7-9e18-034eb9ddd601',
  'profile-1780169301356',
  'aggression',
  1780807599983,
  NULL,
  '[]'::jsonb,
  'Hit Andy while leaving the room',
  '[]'::jsonb,
  'voice',
  'Today was yet another tough day, Robbie was okay in the morning when a babysitter came over until 2pm, however at about noon, Robbie was asked to clean up a space in the playroom that was messy and he denied making the mess even though I had seen him make it. When I insisted that he clean up, he got really upset, threw his fire truck, hit Andy on the way out of the room, and went upstairs as part of a meltdown. He wouldn''t talk to me when I went up to his room about a half hour later and he made a big mess in his room which I had to clean later in the day. Then we all went to Michaels to get art supplies for a family craft night and Robbie was excited throughout the shopping experience but got very upset at the end when we wouldn''t buy him a stuffed octopus and he cried. We went home and did some crafts and he was better but then around dinner time he was using potty language and we didn''t allow him to have a second helping of bread and butter so he threw a lego creation across the room and yet again went up to his room after a meltdown. He bounced back after that and had a quiet evening but it was overall a fairly trying day.',
  NULL,
  '😠',
  'negative',
  '[]'::jsonb,
  2,
  1780807600075,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'e79cc692-5bf5-4847-abf3-d06f3857bc6c',
  'profile-1780169301356',
  'dad_bonding',
  1781071166292,
  NULL,
  '[]'::jsonb,
  'Played baseball outside',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He was extremely well behaved in the evening. He read really quietly. He had a decent dinner. He had gone earlier in the day after school to an ice cream social with Mom and had really wanted to play with his friend, Allie, but the two of them have had to be separated recently because they''ve been naughty at times. So Robbie played baseball outside with Dad as a Dad bonding moment and he went to bed in the same room as his brother. He had his medicine before bed. All in all, a very controlled and regulated day.',
  NULL,
  '👨',
  'positive',
  '[]'::jsonb,
  2,
  1781071166377,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '73466f2d-f7a9-4cbe-98c4-e4721e2edd25',
  'profile-1780169301356',
  'good_dinner',
  1781155856600,
  NULL,
  '[]'::jsonb,
  'Ate a good dinner of steak',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day on the day that saw his mom leave town for a girl''s trip. He was well behaved in the morning and got dressed and left the house without much fuss. He was picked up from school by Karen for a play date and he hung out with her for a little while before asking to go home. He was very chill and docile throughout the evening. He ate a good dinner of steak and he had good manners and cleaned up after himself. He was mild mannered with his siblings. Robbie received a couple of reward toys consistent with a deal he had with his mom where good behavior would lead to these rewards. Robbie and his siblings were good enough to earn TV time in the evening and Robbie went down for bed fairly easily, although he did get up at one point to change his clothes. He took his medicine.',
  NULL,
  '😋',
  'positive',
  '[]'::jsonb,
  2,
  1781155856696,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'd70f09d3-b2cc-449e-a131-a8882336e031',
  'profile-1780169301356',
  'dad_bonding',
  1781240356304,
  NULL,
  '[]'::jsonb,
  'Dad joined Robbie and siblings on playground',
  '[]'::jsonb,
  'voice',
  'Another day with mom out of town. Robbie seemed relatively easy in the morning. I didn''t receive any negative reports about him while he was at school. He stayed a couple hours afterwards to play video games with his teacher, Mr. Nick, which is a prize he won at a silent auction a month ago. Robbie stayed at school even longer with our nanny, Zion, and his siblings to play on the school playground. Dad joined them there and played with them before driving them home to eat dinner. They all ate well and Robbie had dessert afterwards. He volunteered to take a bath and the kids earned a program afterwards and watched TV. Robbie was a little bit difficult at bedtime and got out of his bed several times but ultimately fell asleep. He took his medicine.',
  NULL,
  '👨🏻',
  'positive',
  '[]'::jsonb,
  2,
  1781240356408,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'babffb2b-89de-4d5d-b588-8a5283344ba9',
  'profile-1780169301356',
  'played_outside',
  1781290800000,
  NULL,
  '[]'::jsonb,
  'Played on the playground',
  '[]'::jsonb,
  'voice',
  'Mom out of town in South Carolina, Robbie had no trouble getting ready for school and no incidents to report while there. Zion, our nanny, picked him up to take him to Andy''s graduation outdoors at Ella Bailey Park. Robbie had a lot of popsicles but played in an orderly and active fashion on the playground. He obediently left when we asked him to and was well-behaved on the way home. When we got home, he drew comics and was somewhat dysregulated when asked to bathe. He bounced back quickly from this, however. He and his siblings watched TV in the evening before bed. He took two milligrams of guanfacine.',
  NULL,
  '🌳',
  'neutral',
  '[]'::jsonb,
  2,
  1781420804054,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '0e05943a-05f0-4cb2-bee1-84b7c6f8c3f3',
  'profile-1780169301356',
  'watched_tv',
  1781495794604,
  NULL,
  '[]'::jsonb,
  'Watched TV',
  '[]'::jsonb,
  'voice',
  'Robbie slept in in the morning and came downstairs around 8 a.m. He stayed home with the babysitter Ella and was fine until mid-morning. When dad returned home from the grocery store with Daisy, Andy and Robbie were watching TV. Robbie was asked to stop watching and clean before resuming his program and he became resistant and then angry before having a meltdown and shutting down in his room. He threw things and was generally incensed. He bounced back but it was a frustrating episode that was partly the fault of the babysitter for letting him watch TV to begin with. We picked up mom from the airport at 4 p.m. as a family and Robbie was pleasant through bedtime. He drew comics and was very proud of them when explaining them to mom. He took his two milligrams of guanfacin before sleep.',
  NULL,
  '📺',
  'neutral',
  '[]'::jsonb,
  2,
  1781495794700,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'a1655f92-a356-4bdd-9a7f-d2d623e1c680',
  'profile-1780169301356',
  'drew_comics',
  1781636400000,
  NULL,
  '[]'::jsonb,
  'Drew comics after school',
  '[]'::jsonb,
  'voice',
  'Robbie had a fairly uneventful day. He drew comics after school, ate a good dinner and played nicely with his siblings. He went to bed without any fuss and took his medicine before bed. He was sad throughout the day about his broken friendship with Albie, but was encouragingly open about his emotions with mom and dad. He made an impressive lock structure with his Matchbox cars.',
  NULL,
  '🦸',
  'neutral',
  '[]'::jsonb,
  2,
  1781756594986,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '5f71b93d-40ce-4451-b852-976075f1b10b',
  'profile-1780169301356',
  'playdate',
  1781756264543,
  NULL,
  '[]'::jsonb,
  'Had a playdate with Gus',
  '[]'::jsonb,
  'voice',
  'Robbie went to his last day of first grade today. I am unsure how it went during the day, but at pickup he was despondent and unable to attend the end of year party because of his sadness that he was not going to be able to play with Albie. He wanted to go only if he could play with his friend. I told him, unfortunately, that he couldn''t. He began to cry and said, get me out of here. So I took him home. I offered multiple alternatives like different restaurants or activities, but he was in shutdown and very sad. His lips were quivering. And then we ran into his friend, Gus, who is a year older and was with his mom on the front steps. And I said in a panic, Gus, would you like to join us for a play date? And Robbie, I checked with Robbie and Robbie said, okay. And Gus said, okay. So Gus came to our house and Gus played more with me than with Robbie. Robbie tried to engage him, but Robbie was laughing inappropriately and had strange social skills. Robbie peed his pants three times with Gus here, which Gus thought was strange. Gus asked for help with Robbie because Robbie was being weird. Robbie''s feelings were hurt because Gus didn''t pitch a baseball correctly at him. He got angry and hid in his room a couple of times. He was upset because Daisy was physically aggressive with him. And finally, Gus just wanted to leave. And so it was an unsuccessful play date in general, but Robbie was giddy for some of it and laughing, but he just didn''t have very good social skills and it was kind of awkward. Then we ended up having another family over for dinner that had kids and Robbie played very well with the 10-year-old boy, whose name is Thompson. And they played with pranks and Robbie ate a good dinner and was patient about waiting his turn to get on the back of the electrical bike. And even allowed Daisy to sit on his lap for the ride, but he got very tired and wanted to come home and went to bed earlier than normal. And it''s the beginning of summer.',
  NULL,
  '👫',
  'neutral',
  '[]'::jsonb,
  2,
  1781756264646,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '65421343-b1dc-4d33-913d-ae0329153a98',
  'profile-1780169301356',
  'sibling_harmony',
  1781930553560,
  NULL,
  '[]'::jsonb,
  'Pretended Andy was his butler',
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Sibling Harmony',
  NULL,
  NULL,
  '[]'::jsonb,
  2,
  1781930553561,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '14ffc6a4-3a8b-4d32-8150-55dd30173ef9',
  'profile-1780169301356',
  'playdate',
  1780426800000,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Playdate',
  NULL,
  NULL,
  '[]'::jsonb,
  3,
  1780726192691,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'b9ad2761-4f8a-4f8d-9083-55416c10a651',
  'profile-1780169301356',
  'good_dinner',
  1780513200000,
  NULL,
  '[]'::jsonb,
  'He had a nice dinner of salad and a hot dog.',
  '[]'::jsonb,
  'voice',
  'Robbie went to the zoo on a field trip and had a lot of fun. He had a nice dinner of salad and a hot dog and pushed his sister on the swing after dinner. He had his medicine before bed.',
  NULL,
  NULL,
  'positive',
  '[]'::jsonb,
  3,
  1780710076712,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'cc7b6b2d-bcba-47d3-af5f-6428ebd36b49',
  'profile-1780169301356',
  'sibling_harmony',
  1780599600000,
  NULL,
  '[]'::jsonb,
  'Built blocks with Andy.',
  '[]'::jsonb,
  'voice',
  'Robbie had a good day, he went to school, got dressed on his own, then when he came home he played soccer with dad and built blocks with his brother Andy. He cleaned up his room before going to bed and took his medicine.',
  NULL,
  NULL,
  'positive',
  '[]'::jsonb,
  3,
  1780708957385,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  '7f337268-e631-48d9-96b3-6d9e54d460cf',
  'profile-1780169301356',
  'naughty',
  1780724351187,
  NULL,
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  'quick-tap',
  NULL,
  'Naughty',
  NULL,
  NULL,
  '[]'::jsonb,
  3,
  1780724351188,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'c0dca9c5-42f2-41ed-95c2-1572515fc0d6',
  'profile-1780169301356',
  'messy',
  1780807599983,
  NULL,
  '[]'::jsonb,
  'Made a mess in his room',
  '[]'::jsonb,
  'voice',
  'Today was yet another tough day, Robbie was okay in the morning when a babysitter came over until 2pm, however at about noon, Robbie was asked to clean up a space in the playroom that was messy and he denied making the mess even though I had seen him make it. When I insisted that he clean up, he got really upset, threw his fire truck, hit Andy on the way out of the room, and went upstairs as part of a meltdown. He wouldn''t talk to me when I went up to his room about a half hour later and he made a big mess in his room which I had to clean later in the day. Then we all went to Michaels to get art supplies for a family craft night and Robbie was excited throughout the shopping experience but got very upset at the end when we wouldn''t buy him a stuffed octopus and he cried. We went home and did some crafts and he was better but then around dinner time he was using potty language and we didn''t allow him to have a second helping of bread and butter so he threw a lego creation across the room and yet again went up to his room after a meltdown. He bounced back after that and had a quiet evening but it was overall a fairly trying day.',
  NULL,
  '🫗',
  'negative',
  '[]'::jsonb,
  3,
  1780807600076,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (
  'b08c1e7c-3d13-4ee4-84c5-4f9a899bb1ec',
  'profile-1780169301356',
  'good_dinner',
  1781071166292,
  NULL,
  '[]'::jsonb,
  'Had a decent dinner',
  '[]'::jsonb,
  'voice',
  'Robbie had a really good day. He was extremely well behaved in the evening. He read really quietly. He had a decent dinner. He had gone earlier in the day after school to an ice cream social with Mom and had really wanted to play with his friend, Allie, but the two of them have had to be separated recently because they''ve been naughty at times. So Robbie played baseball outside with Dad as a Dad bonding moment and he went to bed in the same room as his brother. He had his medicine before bed. All in all, a very controlled and regulated day.',
  NULL,
  '😋',
  'positive',
  '[]'::jsonb,
  3,
  1781071166377,
  0
) ON CONFLICT (id) DO NOTHING;

-- Note: Only imported first 50 of 201 events. Run full import script for all data.

-- Relationship Persons
INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  '44955ca7-97e3-4321-84f5-ce8187ce0f57',
  'profile-1780169301356',
  'Andy',
  'Family',
  'Brother',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/2aa65d3b-7d2d-4448-b986-b4b694bb7a8e.jpg',
  '',
  1780376192154,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  '30871f69-1773-4136-b532-092dd5553c29',
  'profile-1780169301356',
  'Dad',
  'Family',
  'Parent',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/9a8fc63d-9e2e-4ece-acce-d53be642b6ef.jpg',
  NULL,
  1780297239436,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  '4438c236-3ae0-4cf2-993d-381a116dd392',
  'profile-1780169301356',
  'Daisy',
  'Family',
  'Sibling',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/b3acedde-88e0-4fde-a4f3-8e9160f8786e.jpg',
  NULL,
  1780376214089,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  'b00ad194-3e65-447f-8f4b-8b5d938701b1',
  'profile-1780169301356',
  'Herbie',
  'Family',
  'Grandparent',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/0f8b02d9-82b9-4b20-82ac-5890e20c49e0.jpg',
  NULL,
  1780376279767,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  'f336b25f-1120-44f5-83e3-111b927e6a54',
  'profile-1780169301356',
  'Lindy',
  'Family (Extended)',
  'Grandparent',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/af08eb1d-b0b1-4f69-892b-2c43563c7910.jpg',
  NULL,
  1780376252564,
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (
  '3c06bdb5-b6a5-4090-b581-5cf8910dd2d9',
  'profile-1780169301356',
  'Mom',
  'Family',
  'Parent',
  NULL,
  'file:///var/mobile/Containers/Data/Application/ADFB0711-592B-414C-81A4-2C76A0227A55/Documents/photos/d5e27383-24b7-4c3c-bcec-4d6efe308f6d.jpg',
  NULL,
  1780376117854,
  0
) ON CONFLICT (id) DO NOTHING;

-- Import complete!
