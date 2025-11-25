const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const trips = client.db(dbName).collection('trips');
  const providerShare = await trips
    .aggregate([
      { $group: { _id: '$selectedQuote.provider', count: { $sum: 1 } } },
      { $project: { provider: '$_id', count: 1, _id: 0 } },
    ])
    .toArray();
  const surgeStats = await trips
    .aggregate([
      { $unwind: '$quotes' },
      {
        $group: {
          _id: '$quotes.provider',
          total: { $sum: 1 },
          surged: { $sum: { $cond: ['$quotes.isSurge', 1, 0] } },
        },
      },
      {
        $project: {
          provider: '$_id',
          total: 1,
          surged: 1,
          surgePct: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [{ $eq: ['$total', 0] }, 0, { $divide: ['$surged', '$total'] }],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          _id: 0,
        },
      },
    ])
    .toArray();
  console.log('Provider share:', providerShare);
  console.log('Quote surge stats:', surgeStats);
  await client.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
