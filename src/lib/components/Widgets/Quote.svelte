<script lang="ts">
    import { onMount } from 'svelte'

    interface Quote {
        text: string
        author: string
    }

    let quote = $state<Quote | null>(null)

    // Curated collection of inspiring quotes and facts
    const quotes: Quote[] = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
        { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
        { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
        { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
        { text: "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.", author: "Roy T. Bennett" },
        { text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
        { text: "There is only one way to avoid criticism: do nothing, say nothing, and be nothing.", author: "Aristotle" },
        { text: "Do what you can with all you have, wherever you are.", author: "Theodore Roosevelt" },
        { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
        { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
        { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
        { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
        { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
        { text: "The best revenge is massive success.", author: "Frank Sinatra" },
        { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
        { text: "Build your own dreams, or someone else will hire you to build theirs.", author: "Farrah Gray" },
        { text: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" },
        { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
        { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do.", author: "Mark Twain" },
        { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Everything has beauty, but not everyone can see.", author: "Confucius" },
        { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank" },
        { text: "Life is 10% what happens to me and 90% of how I react to it.", author: "Charles Swindoll" },
        { text: "An unexamined life is not worth living.", author: "Socrates" },
        { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
        { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
        { text: "The mind is everything. What you think you become.", author: "Buddha" },
        { text: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
        { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
        { text: "We become what we think about.", author: "Earl Nightingale" },
        { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
        { text: "If you can dream it, you can achieve it.", author: "Zig Ziglar" },
        { text: "So many books, so little time.", author: "Frank Zappa" },
        { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
        { text: "You can never get a cup of tea large enough or a book long enough to suit me.", author: "C.S. Lewis" },
        { text: "Outside of a dog, a book is man's best friend. Inside of a dog it's too dark to read.", author: "Groucho Marx, The Essential Groucho" },
        { text: "It is what you read when you don't have to that determines what you will be when you can't help it.", author: "Oscar Wilde" },
        { text: "Believe in yourself. You are braver than you think, more talented than you know...", author: "Roy T. Bennett, The Light in the Heart" },
        { text: "Live the life of your dreams: be brave enough to live the life of your dreams...", author: "Roy T. Bennett, The Light in the Heart" },
        { text: "Do not be pushed around by the fears in your mind. Be led by the dreams in your heart.", author: "Roy T. Bennett, The Light in the Heart" },
        { text: "Attitude is a choice. Happiness is a choice. Optimism is a choice. Kindness is a choice.", author: "Roy T. Bennett, The Light in the Heart" },
        { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
        { text: "And now here is my secret: It is only with the heart that one can see rightly.", author: "Antoine de Saint-Exupéry, The Little Prince" },
        { text: "Don't be afraid of growing slowly; be afraid only of standing still.", author: "Chinese Proverb" },
        { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
        { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
        { text: "If you don’t read the newspaper, you are uninformed. If you do read the newspaper, you are misinformed.", author: "Mark Twain" },
        { text: "Knowledge is knowing a tomato is a fruit; wisdom is not putting it in a fruit salad.", author: "Miles Kington" },
        { text: "Believe you can and you’re halfway there.", author: "Theodore Roosevelt" },
        { text: "The best way out is always through.", author: "Robert Frost" },
        { text: "Female sharks have thicker skin than males.", author: "" },
        { text: "The average ocean depth equals about eight Empire State Buildings stacked.", author: "" },
        { text: "The adult human skeleton has 206 bones; babies have about 270-300.", author: "" },
        { text: "Madagascar hissing cockroaches hiss to communicate.", author: "" },
        { text: "The human body’s largest organ is skin.", author: "" },
        { text: "Your tongue print is unique — no two are alike.", author: "" },
        { text: "The shortest recorded war lasted about 38 minutes (Anglo-Zanzibar War).", author: "" },
        { text: "The North Pole has no official time zone.", author: "" },
        { text: "Comets can smell like rotten eggs due to chemical composition.", author: "" },
        { text: "A cloud weighs roughly 500 tons.", author: "" },
        { text: "Identical twins don’t have identical fingerprints.", author: "" },
        { text: "Earth’s rotation is slowing; days lengthen over time.", author: "" },
        { text: "At any moment there are about 1,800 thunderstorms occurring on Earth.", author: "" },
        { text: "Hippos secrete a natural reddish ‘sunscreen’ pigment.", author: "" },
        { text: "The International Space Station orbits Earth about every 92 minutes.", author: "" },
        { text: "Astronauts can’t burp in space; gases behave differently without gravity.", author: "" },
        { text: "More than half of Earth’s oxygen comes from ocean plankton and plants.", author: "" },
        { text: "Bananas are slightly radioactive due to potassium content.", author: "" },
        { text: "Water can exist simultaneously as solid, liquid, and gas at the triple point.", author: "" },
        { text: "Helium becomes a superfluid with zero friction at near-absolute zero.", author: "" },
        { text: "Soil contains more microorganisms in a teaspoon than there are people on Earth.", author: "" },
        { text: "Fleas can jump more than 100 times their body height.", author: "" },
        { text: "Sound travels about four times faster in water than in air.", author: "" },
        { text: "The 1883 eruption of Krakatau is one of the loudest sounds in history.", author: "" },
        { text: "The largest known prime number has over 41 million digits.", author: "" },
        { text: "Frogs breathe and absorb water through their skin.", author: "" },
        { text: "A turtle’s shell is made from about 50 bones.", author: "" },
        { text: "Earth’s magnetic poles have reversed many times over millions of years.", author: "" },
        { text: "Earliest humans lived in Africa around 2.8 million years ago.", author: "" },
        { text: "The Sun’s pressure waves produce sound too low for human ears.", author: "" },
        { text: "The deepest ocean trenches exceed depths equivalent to 25 Empire State Buildings.", author: "" },
        { text: "Spacecraft orbital speed keeps the ISS in free fall around Earth.", author: "" },
        { text: "Oxygen production in oceans largely comes from microscopic marine organisms.", author: "" },
        { text: "Human body growth fuses many infant bones into adult skeletal structure.", author: "" },
        { text: "Frog and turtle physiology shows remarkable adaptations to environment.", author: "" }
    ]

    function getRandomQuote(): Quote {
        return quotes[Math.floor(Math.random() * quotes.length)]
    }

    onMount(() => {
        quote = getRandomQuote()
    })
</script>

{#if quote}
    <div class="max-w-lg mx-auto mb-12">
        <div>
            <blockquote class="text-left">
                <p class="text-xl text-slate-400 dark:text-slate-700">
                    {quote.text}
                </p>
                {#if quote.author}
                    <footer class="text-end">
                        <cite class="text-lg text-slate-400 dark:text-slate-700 italic">
                            — {quote.author}
                        </cite>
                    </footer>
                {/if}
            </blockquote>
        </div>
    </div>
{/if}
