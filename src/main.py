from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import memcache
from django.utils import simplejson
from models import Level, User, Submission
from dict2xml import dict2xml
import datetime
import os

# game length, in minutes
GAME_LENGTH = 2
# showing the highscores, in minutes
HIGHSCORE_LENGTH = 1

def get_current_level():
    level = memcache.get('level')
    if level is None:
        now = datetime.datetime.now()
        level = Level.all().filter('time <=', now).filter('time >=', now - datetime.timedelta(minutes = GAME_LENGTH + HIGHSCORE_LENGTH)).get()
        #memcache.set('level', level)
    return level

class HandshakeHandler(webapp.RequestHandler):
    def get(self):
        action = self.request.get('action', 'get_state')
        format = self.request.get('format', 'json')
        if action == 'get_state':
            res = {'game_length' : GAME_LENGTH,
                   'highscore_length' : HIGHSCORE_LENGTH}
            
            level = get_current_level()
            
            if level is not None:
                now = datetime.datetime.now()
                then = level.time + datetime.timedelta(minutes = GAME_LENGTH)
            
                if now < then:
                    res['state'] = 'game'
                    res['remaining_time'] = (then - now).seconds
                else:
                    res['state'] = 'highscore'
                    res['remaining_time'] = (then + datetime.timedelta(minutes = HIGHSCORE_LENGTH) - now).seconds
            else :
                res = {'error': 'could not find any levels'}
            
        if format == 'json':
            res = simplejson.dumps({'response': res})
        elif format == 'xml':
            res = dict2xml({'response': res}).to_string()
        
        self.response.out.write(res)
            

class LevelHandler(webapp.RequestHandler):

    def get(self):
        level = get_current_level()
        
        if level is not None:
            format = self.request.get('format', 'json').lower()
            
            if format == "json":
                res = level.to_json()
            elif format == "xml":
                res = level.to_xml()
                
            self.response.out.write(res)
            
    def post(self):
        
        format = self.request.get('format', 'json').lower()
        id = self.request.get('level_id', None)
        if id is None:
            res = {"response": {"error": "no level id with submission"}}
        else:
            level = Level.get_by_id(long(id))
            user_name = self.request.get('user')
            user = User.all().filter('name =', user_name).get()
            if user is None:
                user = User(name = user_name)
                user.put()
            score = self.request.get('score', 0)
            words_found = self.request.get('words_found').split(",")
                 
            submission = Submission()
            submission.user = user
            submission.level = level
            submission.score = score
            submission.words_found = words_found
            submission.time = datetime.datetime.now()
            submission.put()
            
            res = {"response": {"status" : "OK"}}
        
        if format == "json":
            self.response.out.write(simplejson.dumps(res))
        elif format == "xml":
            self.response.out.write(dict2xml(res).to_string())
            

class ScoreHandler(webapp.RequestHandler):
    
    def get_user_stats(self, user, format):
        user = User.all().filter("name =", user).get()
        if user is not None:
            played = 0
            submissions = user.submission_set
            if submissions is not None:
                played = submissions.count()
            
            res = {"response": {"user" : user.name, "played" : played}}
        else :
            res = {"response": {"error": "unknown user"}}
            
        if format == "json":
            res = simplejson.dumps(res)
        elif format == "xml":
            res = dict2xml(res).to_string()
            
        return res
    
    def get_level_stats(self, format, delta = datetime.timedelta(), page = 0, limit = 100):
        level = get_current_level()
            
        if level is not None:
            submissions = Submission.all().filter("time >", level.time - delta).order('time').order('-score').fetch(limit, page * limit)

            i = 1
            ranks = []
            for submission in submissions:
                obj = {"rank" : i,
                      "user" : submission.user.name,
                      "score" : submission.score}
                
                if format == "json":
                    ranks.append(obj)
                elif format == "xml":
                    ranks.append({"ranking": obj})
                
                i = i + 1
            
            res = {"response": ranks}
        else :
            res = {"response": {"error": "could not get the level"}}
            
        if format == "json":
            return simplejson.dumps(res)
        elif format == "xml":
            return dict2xml(res).to_string()
        
    '''def get_user_rank(self, user, limit_before = 49, limit_after = 50, format):
        user = User.all().filter("name =", user).get()
        if user is not None:'''
            
            
    def get(self):

        format = self.request.get('format', 'json').lower()
        user = self.request.get('user', None)
        if user is not None:
            res = self.get_user_stats(user, format)   
        else:
            range = self.request.get('range', 'now')
            page = int(self.request.get('page', 0))
            limit = int(self.request.get('limit', 100))
            delta = datetime.timedelta()
            if range == 'hour':
                delta = datetime.timedelta(hours = 1)
            elif range == 'day':
                delta = datetime.timedelta(days = 1)
            elif range == 'week':
                delta = datetime.timedelta(weeks = 1)
            elif range == 'all':
                delta = datetime.timedelta(weeks = 2000 * 52)
                
            res = self.get_level_stats(format, delta, page, limit)
        
        self.response.out.write(res)   
                

class ClientHandler(webapp.RequestHandler):
    def get(self):
        path = os.path.join(os.path.dirname(__file__), 'client/index.html')
        file = open(path)
        self.response.out.write(file.read())
                        
    
application = webapp.WSGIApplication([('/level', LevelHandler),
                                      ('/score', ScoreHandler),
                                      ('/join', HandshakeHandler),
                                      ('/', ClientHandler)], debug=True)


def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
