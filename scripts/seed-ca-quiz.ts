import { PrismaClient, ExamTestType, ExamAccess } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Seeding Current Affairs Quizzes in database...")

    // 1. Upsert ExamSeries for Current Affairs
    const series = await prisma.examSeries.upsert({
        where: { slug: "current-affairs-quizzes" },
        update: {
            title: "Current Affairs & Daily Quizzes Series",
            category: "Current Affairs Quizzes",
            isPublished: true,
            isFree: true,
        },
        create: {
            id: "current-affairs-quizzes",
            slug: "current-affairs-quizzes",
            title: "Current Affairs & Daily Quizzes Series",
            examName: "Current Affairs & Quizzes",
            category: "Current Affairs Quizzes",
            description: "Daily and weekly current affairs quizzes, national & international events, and general awareness tests.",
            isPublished: true,
            isFree: true,
            totalTests: 2,
            createdById: "system-admin",
        },
    })

    // 2. Create Sample Quiz 1: Daily Current Affairs Quiz
    const test1 = await prisma.examTest.upsert({
        where: { id: "ca-daily-quiz-sep27" },
        update: {
            title: "Daily Current Affairs Speed Quiz — 27 September 2026",
            titleHi: "दैनिक समसामयिकी स्पीड क्विज — 27 सितम्बर 2026",
            testType: ExamTestType.CHAPTER_TEST,
            accessMode: ExamAccess.FREE,
            durationMinutes: 15,
            totalQuestions: 5,
            totalMarks: 10,
            positiveMarks: 2.0,
            negativeMarks: 0.66,
            isPublished: true,
        },
        create: {
            id: "ca-daily-quiz-sep27",
            seriesId: series.id,
            title: "Daily Current Affairs Speed Quiz — 27 September 2026",
            titleHi: "दैनिक समसामयिकी स्पीड क्विज — 27 सितम्बर 2026",
            testType: ExamTestType.CHAPTER_TEST,
            accessMode: ExamAccess.FREE,
            durationMinutes: 15,
            totalQuestions: 5,
            totalMarks: 10,
            positiveMarks: 2.0,
            negativeMarks: 0.66,
            isPublished: true,
            createdById: "system-admin",
        },
    })

    // Upsert Section
    const section1 = await prisma.examSection.upsert({
        where: { id: "ca-sec-1" },
        update: {
            title: "Current Affairs & GK",
            titleHi: "समसामयिकी एवं सामान्य ज्ञान",
        },
        create: {
            id: "ca-sec-1",
            testId: test1.id,
            title: "Current Affairs & GK",
            titleHi: "समसामयिकी एवं सामान्य ज्ञान",
            order: 1,
            positiveMarks: 2.0,
            negativeMarks: 0.66,
        },
    })

    // Upsert Questions
    const questionsData = [
        {
            id: "ca-q1",
            sectionId: section1.id,
            order: 1,
            questionEn: "Which country hosted the 2026 Global Artificial Intelligence and Sustainable Development Summit?",
            questionHi: "2026 ग्लोबल आर्टिफिशियल इंटेलिजेंस एंड सस्टेनेबल डेवलपमेंट समिट की मेजबानी किस देश ने की?",
            optionAEn: "India",
            optionBEn: "Japan",
            optionCEn: "Germany",
            optionDEn: "United Arab Emirates",
            optionAHi: "भारत",
            optionBHi: "जापान",
            optionCHi: "जर्मनी",
            optionDHi: "संयुक्त अरब अमीरात",
            correctOption: "A",
            explanationEn: "India successfully hosted the Global AI and Sustainable Development Summit with key policy focus on digital public infrastructure.",
            subject: "Current Affairs",
            topic: "International Summits",
        },
        {
            id: "ca-q2",
            sectionId: section1.id,
            order: 2,
            questionEn: "What is the primary focus of the recently launched PM-PRANAM scheme in agriculture?",
            questionHi: "कृषि क्षेत्र में हाल ही में शुरू की गई पीएम-प्रणाम योजना का प्राथमिक उद्देश्य क्या है?",
            optionAEn: "Promoting chemical fertilizer consumption",
            optionBEn: "Incentivizing alternative fertilizers and balanced use of nutrients",
            optionCEn: "Direct cash transfer to large farm enterprises",
            optionDEn: "Subsidizing diesel tractor purchases",
            optionAHi: "रासायनिक उर्वरकों के उपयोग को बढ़ावा देना",
            optionBHi: "वैकल्पिक उर्वरकों और पोषक तत्वों के संतुलित उपयोग को बढ़ावा देना",
            optionCHi: "बड़े कृषि उद्यमों को सीधा नकद हस्तांतरण",
            optionDHi: "डीजल ट्रैक्टर की खरीद पर सब्सिडी",
            correctOption: "B",
            explanationEn: "PM-PRANAM aims to promote balanced use of fertilizers and incentivize states to adopt natural and organic farming alternatives.",
            subject: "Current Affairs",
            topic: "Government Schemes",
        },
        {
            id: "ca-q3",
            sectionId: section1.id,
            order: 3,
            questionEn: "In the context of the Indian Economy, what does the term 'Unified Lending Interface' (ULI) refer to?",
            questionHi: "भारतीय अर्थव्यवस्था के संदर्भ में 'यूनिफाइड लेंडिंग इंटरफेस' (ULI) किससे संबंधित है?",
            optionAEn: "Seamless credit appraisal platform launched by the Reserve Bank of India",
            optionBEn: "Stock market trading interface for small-cap equities",
            optionCEn: "Forex currency hedging tool for exporters",
            optionDEn: "Cryptocurrency transaction protocol",
            optionAHi: "भारतीय रिजर्व बैंक द्वारा शुरू किया गया सुगम ऋण मूल्यांकन मंच",
            optionBHi: "स्मॉल-कैप इक्विटी के लिए शेयर बाजार ट्रेडिंग इंटरफेस",
            optionCHi: "निर्यातकों के लिए विदेशी मुद्रा हेजिंग उपकरण",
            optionDHi: "क्रिप्टोकरेंसी लेनदेन प्रोटोकॉल",
            correctOption: "A",
            explanationEn: "ULI is a digital public infrastructure developed by RBI to provide frictionless credit flow, especially to rural and small borrowers.",
            subject: "Economy & Banking",
            topic: "Banking & Financial News",
        },
        {
            id: "ca-q4",
            sectionId: section1.id,
            order: 4,
            questionEn: "Which space agency recently conducted the test flight of the reusable launch vehicle 'Pushpak'?",
            questionHi: "किस अंतरिक्ष एजेंसी ने हाल ही में पुन: प्रयोज्य प्रक्षेपण यान 'पुष्पक' का सफल परीक्षण किया?",
            optionAEn: "NASA",
            optionBEn: "ISRO",
            optionCEn: "ESA",
            optionDEn: "JAXA",
            optionAHi: "नासा",
            optionBHi: "इसरो (ISRO)",
            optionCHi: "ईएसए (ESA)",
            optionDHi: "जाक्सा (JAXA)",
            correctOption: "B",
            explanationEn: "ISRO achieved a major milestone in autonomous landing and reusable launch vehicle (RLV-LEX) technology with Pushpak.",
            subject: "Science & Technology",
            topic: "Space Missions",
        },
        {
            id: "ca-q5",
            sectionId: section1.id,
            order: 5,
            questionEn: "The 'Mission Mausam' initiative recently approved by the Union Cabinet is aimed at which of the following?",
            questionHi: "केंद्रीय मंत्रिमंडल द्वारा हाल ही में अनुमोदित 'मिशन मौसम' का मुख्य उद्देश्य क्या है?",
            optionAEn: "Enhancing weather forecasting accuracy and climate resilience",
            optionBEn: "Accelerating artificial cloud-seeding in desert territories only",
            optionCEn: "Monitoring air passenger flight delays during monsoon",
            optionDEn: "Subsidizing greenhouse gas measurement instruments",
            optionAHi: "मौसम पूर्वानुमान की सटीकता और जलवायु लचीलेपन को बढ़ाना",
            optionBHi: "केवल मरुस्थलीय क्षेत्रों में कृत्रिम वर्षा कराना",
            optionCHi: "मानसून के दौरान हवाई यात्री उड़ानों की देरी की निगरानी",
            optionDHi: "ग्रीनहाउस गैस मापन उपकरणों पर सब्सिडी देना",
            correctOption: "A",
            explanationEn: "Mission Mausam is an ambitious initiative by the Ministry of Earth Sciences to upgrade weather radar networks, supercomputing models, and forecasting precision.",
            subject: "Environment & Science",
            topic: "Government Initiatives",
        },
    ]

    for (const q of questionsData) {
        await prisma.examQuestion.upsert({
            where: { id: q.id },
            update: {
                questionEn: q.questionEn,
                questionHi: q.questionHi,
                optionAEn: q.optionAEn,
                optionBEn: q.optionBEn,
                optionCEn: q.optionCEn,
                optionDEn: q.optionDEn,
                correctOption: q.correctOption,
                explanationEn: q.explanationEn,
                subject: q.subject,
                topic: q.topic,
            },
            create: {
                id: q.id,
                sectionId: q.sectionId,
                order: q.order,
                questionEn: q.questionEn,
                questionHi: q.questionHi,
                optionAEn: q.optionAEn,
                optionBEn: q.optionBEn,
                optionCEn: q.optionCEn,
                optionDEn: q.optionDEn,
                optionAHi: q.optionAHi,
                optionBHi: q.optionBHi,
                optionCHi: q.optionCHi,
                optionDHi: q.optionDHi,
                correctOption: q.correctOption,
                explanationEn: q.explanationEn,
                subject: q.subject,
                topic: q.topic,
            },
        })
    }

    console.log("✓ Successfully seeded Current Affairs Daily Quiz into database!")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
