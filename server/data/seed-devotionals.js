const devotionals = [
    {
        title: "The Foundation of Faith",
        scripture: "Hebrews 11:1 - Now faith is confidence in what we hope for and assurance about what we do not see.",
        reflection: "Faith begins where our understanding ends. It's not about having all the answers, but trusting the One who does.",
        prayer: "Lord, strengthen my faith today. Help me to trust You even when I don't understand.",
        action_step: "Identify one area where you need to trust God more today. Pray specifically about it.",
        date: new Date().toISOString().split('T')[0]
    },
    {
        title: "Peace in the Storm",
        scripture: "Philippians 4:6-7 - Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
        reflection: "God's peace isn't the absence of storms, but His presence within them.",
        prayer: "Father, I bring my worries to You. Exchange my anxiety for Your peace.",
        action_step: "Write down three things you're thankful for right now.",
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    },
    {
        title: "The Power of Grace",
        scripture: "Ephesians 2:8-9 - For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God.",
        reflection: "Grace means we don't have to earn God's love. Rest in His finished work today.",
        prayer: "Thank You, Jesus, for Your gift of grace. Help me to receive it fully.",
        action_step: "Extend grace to someone who doesn't deserve it today.",
        date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
    },
    {
        title: "Walking in Love",
        scripture: "1 Corinthians 13:4-5 - Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
        reflection: "God's love in us changes how we see people. It's a choice to treat others with patience and kindness.",
        prayer: "Lord, fill me with Your love today. Help me to be patient, kind, and forgiving.",
        action_step: "Show unexpected kindness to one person today.",
        date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    },
    {
        title: "Strength in Weakness",
        scripture: "2 Corinthians 12:9 - But he said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.'",
        reflection: "Our weaknesses aren't obstacles to God's work—they're opportunities for His power.",
        prayer: "God, I give You my weaknesses today. Work through them for Your glory.",
        action_step: "Share a weakness with God and ask for His strength.",
        date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
    }
];

module.exports = devotionals;
