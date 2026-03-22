import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Users, Award, Globe, Star, TrendingUp, MessageCircle, CheckCircle, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Navbar for Landing */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-bold text-2xl text-primary tracking-tight">
            SkillVerse
          </div>
          <div className="flex gap-4">
            <Link 
              to="/signin" 
              className="px-6 py-2 text-foreground hover:text-primary transition-colors font-medium"
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Signup
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center space-y-6">
          <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
            <p className="text-primary text-sm font-semibold">Welcome to SkillVerse</p>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Show Your Skill.
            <br />
            <span className="text-primary">Build Your Reputation.</span>
            <br />
            Get Hired.
          </h1>
          <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
            SkillVerse is the platform where talented individuals showcase their expertise, build trust through ratings and reviews, monetize their skills, and connect with clients worldwide. Your reputation is your currency.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Link 
              to="/signup" 
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 text-lg hover:shadow-lg"
            >
              Signup <ArrowRight size={20} />
            </Link>
            <Link 
              to="/signin" 
              className="px-8 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium text-lg"
            >
              Login
            </Link>
          </div>

       
        </div>

        {/* Hero Visual */}
        <div className="mt-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-8 aspect-video flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/50 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-primary/30 rounded-full blur-3xl"></div>
          </div>
          <div className="text-center relative z-10">
            <Globe size={80} className="text-primary/60 mx-auto mb-4" />
            <p className="text-foreground/50 text-lg">Connect with skilled professionals worldwide</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">Core Features</h2>
        <p className="text-center text-foreground/70 mb-16 max-w-2xl mx-auto">
          Everything you need to succeed as a skilled professional in the digital economy
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Award,
              title: 'Showcase Skills',
              description: 'Create a compelling profile that highlights your expertise. Upload portfolios, certifications, and work samples to stand out from the crowd.'
            },
            {
              icon: Star,
              title: 'Get Rated',
              description: 'Build credibility through client ratings and reviews. Your reputation score increases with every successful project and positive feedback.'
            },
            {
              icon: TrendingUp,
              title: 'Sell Products',
              description: 'Monetize your expertise by selling digital products, courses, templates, and services. Set your own prices and scale your income.'
            },
            {
              icon: Users,
              title: 'Get Hired',
              description: 'Connect directly with clients looking for your exact skill set. Receive project offers and build long-term professional relationships.'
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="p-6 rounded-xl bg-gradient-to-br from-background to-background/50 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 group">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon size={28} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-foreground/70 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-center text-foreground/70 mb-16 max-w-2xl mx-auto">
          Get started in 4 simple steps and launch your skill-based business today
        </p>
        
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Create Account',
              description: 'Sign up in minutes and set up your professional profile with your skills, experience, and expertise.'
            },
            {
              step: '02',
              title: 'Post Your Skills',
              description: 'Showcase your talents by creating detailed skill listings with descriptions, rates, and portfolio samples.'
            },
            {
              step: '03',
              title: 'Get Ratings',
              description: 'Deliver excellent work and receive ratings and reviews from satisfied clients that build your reputation.'
            },
            {
              step: '04',
              title: 'Earn & Get Hired',
              description: 'Grow your income through projects, sell digital products, and attract high-quality clients for long-term partnerships.'
            }
          ].map((item, idx) => (
            <div key={idx} className="relative group">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-6 h-full hover:border-primary/60 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">{item.step}</div>
                  <div className="bg-primary/20 text-primary rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-foreground/70 text-sm leading-relaxed">{item.description}</p>
              </div>
              {idx < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight size={24} className="text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/40 rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6">Ready to Showcase Your Skills?</h2>
            <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals earning money and building their reputation on SkillVerse. Start your journey today for free.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/signup" 
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg hover:shadow-lg"
              >
                Get Started for Free
              </Link>
              <Link 
                to="/signin" 
                className="px-8 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium text-lg"
              >
                Already Have Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-16 bg-background/50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Footer Content */}
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* About */}
            <div>
              <h4 className="font-bold text-lg mb-4 text-primary">About SkillVerse</h4>
              <p className="text-foreground/70 text-sm leading-relaxed">
                SkillVerse is a platform dedicated to empowering skilled professionals to showcase their talents, build reputation, monetize expertise, and connect with clients globally.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-semibold mb-4">For Professionals</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Browse Skills</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Success Stories</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support & Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Contact & Social */}
            <div>
              <h4 className="font-semibold mb-4">Contact & Follow</h4>
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Email: <a href="mailto:hello@skillverse.com" className="text-primary hover:text-primary/80 transition-colors">hello@skillverse.com</a>
                </p>
                <p className="text-sm text-foreground/70">
                  Phone: <a href="tel:+1234567890" className="text-primary hover:text-primary/80 transition-colors">+1 (234) 567-890</a>
                </p>
                <div className="flex gap-3 pt-2">
                  <a href="#" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Facebook">
                    <Facebook size={18} />
                  </a>
                  <a href="#" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Twitter">
                    <Twitter size={18} />
                  </a>
                  <a href="#" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="LinkedIn">
                    <Linkedin size={18} />
                  </a>
                  <a href="#" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Instagram">
                    <Instagram size={18} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-foreground/50 text-sm">&copy; 2024 SkillVerse. All rights reserved.</p>
              <div className="flex gap-6 text-sm text-foreground/50 mt-4 md:mt-0">
                <a href="#" className="hover:text-primary transition-colors">Security</a>
                <a href="#" className="hover:text-primary transition-colors">Status</a>
                <a href="#" className="hover:text-primary transition-colors">Blog</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
