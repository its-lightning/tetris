from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import random
import string
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv



# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'your_database_url')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# Initialize SQLAlchemy and SocketIO
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)
    
# Game rooms dictionary to store active games
game_rooms = {}

# Define models
class Player(db.Model):
    player_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(255), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_login = db.Column(db.DateTime)

class Admin(db.Model):
    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

class LoginInformation(db.Model):
    player_id = db.Column(db.Integer, db.ForeignKey('player.player_id'), primary_key=True)
    password = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(50), nullable=False, default='PLAYER')
    
    # Relationship
    player = db.relationship('Player', backref=db.backref('login_info', uselist=False))

class Tournament(db.Model):
    tournament_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('player.player_id'))
    
    # Relationship
    creator = db.relationship('Player', backref='created_tournaments')
    
    @property
    def is_active(self):
        now = datetime.now()
        return self.start_date <= now <= self.end_date


class Highscore(db.Model):
    highscore_id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.player_id'))
    score = db.Column(db.Integer, nullable=False)
    time = db.Column(db.DateTime, default=datetime.now)
    
    # Relationship
    player = db.relationship('Player', backref=db.backref('highscores'))

# Generate a random room code
def generate_room_code():
    letters = string.ascii_uppercase
    return ''.join(random.choice(letters) for i in range(6))

# Routes
@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Find player
        player = Player.query.filter_by(username=username).first()
        
        if player:
            # Get login information
            login_info = LoginInformation.query.filter_by(player_id=player.player_id).first()
            
            if login_info and bcrypt.checkpw(password.encode('utf-8'), login_info.password.encode('utf-8')):
                # Create session
                session['user_id'] = player.player_id
                session['username'] = player.username
                session['user_type'] = login_info.role
                
                # Update last login time
                player.last_login = datetime.now()
                db.session.commit()
                
                return redirect(url_for('dashboard'))
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        
        # Check if username already exists
        existing_user = Player.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists')
            return redirect(url_for('signup'))
        
        # Check if email already exists
        existing_email = Player.query.filter_by(email=email).first()
        if existing_email:
            flash('Email already exists')
            return redirect(url_for('signup'))
        
        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create new player
        new_player = Player(username=username, email=email)
        db.session.add(new_player)
        db.session.flush()  # Get the player_id
        
        # Create login information (always as PLAYER role)
        login_info = LoginInformation(
            player_id=new_player.player_id,
            password=hashed_password.decode('utf-8'),
            role='PLAYER'  # Always set to PLAYER
        )
        db.session.add(login_info)
        db.session.commit()
        
        flash('Account created successfully! Please login.')
        return redirect(url_for('login'))
    
    return render_template('signup.html')

@app.route('/create_temp_admin')
def create_temp_admin():
    '''if Admin.query.filter_by(username='reee').first():
        return "Admin already exists!"
    hashed_password = bcrypt.hashpw('reee'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin = Admin(username='reee', password=hashed_password) this isint a real login hehehe
    db.session.add(admin) it wont work you can try ree if you want
    db.session.commit()'''
    return "Chu thought chu could get away with trying to make an admin account? you aint making it out of here alive!" 


@app.route('/api/save_highscore', methods=['POST'])
def save_highscore():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json
    score = data.get('score', 0)
    
    # Check if player already has a highscore
    existing_highscore = Highscore.query.filter_by(player_id=session['user_id']).first()
    
    is_new_highscore = False
    
    if existing_highscore:
        # Update if new score is higher
        if score > existing_highscore.score:
            existing_highscore.score = score
            existing_highscore.time = datetime.now()
            db.session.commit()
            is_new_highscore = True
    else:
        # Create new highscore
        new_highscore = Highscore(
            player_id=session['user_id'],
            score=score,
            time=datetime.now()
        )
        db.session.add(new_highscore)
        db.session.commit()
        is_new_highscore = True
    
    return jsonify({
        'success': True, 
        'is_new_highscore': is_new_highscore,
        'score': score
    })

@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        admin = Admin.query.filter_by(username=username).first()
        if admin and bcrypt.checkpw(password.encode('utf-8'), admin.password.encode('utf-8')):
            session.clear()  # Clear any existing session data
            session['admin_id'] = admin.admin_id
            session['admin_username'] = admin.username
            session['user_type'] = 'ADMIN'
            session.modified = True
            session.permanent = True  # Make the session persistent
            print(session)  # Debug: check session contents before redirect
            return redirect(url_for('admin_dashboard'))
        flash('Invalid admin credentials')
    return render_template('admin_login.html')


@app.route('/admin/tournaments')
def admin_tournaments():
    if 'admin_id' not in session or session.get('user_type') != 'ADMIN':
        flash('Access denied')
        return redirect(url_for('dashboard'))
    
    tournaments = Tournament.query.all()
    return render_template('admin/tournaments.html', tournaments=tournaments)

@app.route('/admin/tournaments/create', methods=['GET', 'POST'])
def create_tournament():
    if 'admin_id' not in session or session.get('user_type') != 'ADMIN':
        flash('Access denied')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        start_date = datetime.strptime(request.form.get('start_date'), '%Y-%m-%dT%H:%M')
        end_date = datetime.strptime(request.form.get('end_date'), '%Y-%m-%dT%H:%M')
        
        new_tournament = Tournament(
            name=name,
            description=description,
            start_date=start_date,
            end_date=end_date,
            created_by=session['user_id'],
            is_active=request.form.get('is_active') == 'on'
        )
        
        db.session.add(new_tournament)
        db.session.commit()
        
        flash('Tournament created successfully')
        return redirect(url_for('admin_tournaments'))
    
    return render_template('admin/create_tournament.html')

@app.route('/admin/tournaments/<int:tournament_id>/edit', methods=['GET', 'POST'])
def edit_tournament(tournament_id):
    if 'admin_id' not in session or session.get('user_type') != 'ADMIN':
        flash('Access denied')
        return redirect(url_for('dashboard'))
    
    tournament = Tournament.query.get_or_404(tournament_id)
    
    if request.method == 'POST':
        tournament.name = request.form.get('name')
        tournament.description = request.form.get('description')
        tournament.start_date = datetime.strptime(request.form.get('start_date'), '%Y-%m-%dT%H:%M')
        tournament.end_date = datetime.strptime(request.form.get('end_date'), '%Y-%m-%dT%H:%M')
        tournament.is_active = request.form.get('is_active') == 'on'
        
        db.session.commit()
        
        flash('Tournament updated successfully')
        return redirect(url_for('admin_tournaments'))
    
    return render_template('admin/edit_tournament.html', tournament=tournament)



@app.route('/admin')
def admin_dashboard():
    if 'admin_id' not in session or session.get('user_type') != 'ADMIN':
        flash('Access denied')
        return redirect(url_for('dashboard'))
    players = Player.query.all()
    tournaments = Tournament.query.all()
    now = datetime.utcnow()
    return render_template('admin.html', players=players, tournaments=tournaments, now=now)


@app.route('/admin/add_admin', methods=['GET', 'POST'])
def add_admin():
    if 'admin_id' not in session or session.get('user_type') != 'ADMIN':
        flash('Access denied')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Check if admin already exists
        existing_admin = Admin.query.filter_by(username=username).first()
        if existing_admin:
            flash('Admin with this username already exists')
            return redirect(url_for('add_admin'))
        
        # Create new admin directly
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_admin = Admin(
            username=username,
            password=hashed_password
        )
        
        db.session.add(new_admin)
        db.session.commit()
        
        flash(f'New admin {username} has been created')
        return redirect(url_for('admin_dashboard'))
    
    return render_template('add_admin.html')


@app.route('/add_tournament', methods=['GET', 'POST'])
def add_tournament():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        tournament = Tournament(
            name=name,
            description=description,
            start_date=datetime.strptime(start_date, '%Y-%m-%dT%H:%M'),
            end_date=datetime.strptime(end_date, '%Y-%m-%dT%H:%M'),
            created_by=None  # Or link to an admin if you want
        )
        db.session.add(tournament)
        db.session.commit()
        flash('Tournament added!')
        return redirect(url_for('admin_dashboard'))
    return render_template('add_tournament.html')


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    player = Player.query.get(session['user_id'])
    
    # Get top 10 highscores from all players
    leaderboard = db.session.query(
        Highscore, Player.username
    ).join(
        Player, Highscore.player_id == Player.player_id
    ).order_by(
        Highscore.score.desc()
    ).limit(10).all()
    
    # Get current player's highscore and rank
    player_highscore = Highscore.query.filter_by(player_id=session['user_id']).first()
    
    if player_highscore:
        # Calculate player's rank
        rank_query = db.session.query(
            db.func.count(Highscore.highscore_id)
        ).filter(
            Highscore.score > player_highscore.score
        ).scalar()
        
        player_rank = rank_query + 1
    else:
        player_highscore = None
        player_rank = None
    
    return render_template(
        'dashboard.html', 
        player=player, 
        leaderboard=leaderboard,
        player_highscore=player_highscore,
        player_rank=player_rank
    )


@app.route('/host')
def host_game():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Generate a unique room code
    room_code = generate_room_code()
    
    # Create a new game room
    game_rooms[room_code] = {
        'host_id': session['user_id'],
        'host_name': session['username'],
        'players': [{
            'id': session['user_id'],
            'username': session['username'],
            'sid': None  # Will be updated when socket connects
        }],
        'status': 'waiting'
    }
    
    # Store room code in session
    session['current_room'] = room_code
    
    return render_template('host.html', room_code=room_code)

@app.route('/join/<room_code>')
def join_game(room_code):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if room_code not in game_rooms:
        flash('Game room not found')
        return redirect(url_for('dashboard'))
    
    if game_rooms[room_code]['status'] != 'waiting':
        flash('Game has already started')
        return redirect(url_for('dashboard'))
    
    return render_template('waiting_room.html', room_code=room_code)

@app.route('/play/<room_code>')
def play_game(room_code):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if room_code not in game_rooms:
        flash('Game room not found')
        return redirect(url_for('dashboard'))
    
    is_host = game_rooms[room_code]['host_id'] == session['user_id']
    
    return render_template('play.html', room_code=room_code, is_host=is_host)

@app.route('/singleplayer')
def singleplayer():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Check for active tournaments
    active_tournament = Tournament.query.filter(
        Tournament.start_date <= datetime.now(),
        Tournament.end_date >= datetime.now(),
        Tournament.is_active == True
    ).first()
    
    tournament_id = active_tournament.tournament_id if active_tournament else None
    
    return render_template('singleplayer.html', tournament_id=tournament_id)


from datetime import datetime

@app.route('/tournaments')
def tournaments():
    tournaments = Tournament.query.all()
    return render_template('tournaments.html', tournaments=tournaments, datetime=datetime, now=datetime.utcnow())


@app.route('/api/save_score', methods=['POST'])
def save_score():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json
    score = data.get('score', 0)
    tournament_id = data.get('tournament_id')
    
    # Check if this is a new high score for the player
    player_best = Highscore.query.filter_by(player_id=session['user_id']).order_by(Highscore.score.desc()).first()
    
    is_new_highscore = not player_best or score > player_best.score
    
    # Save the score
    new_score = Highscore(
        player_id=session['user_id'],
        score=score,
        tournament_id=tournament_id if tournament_id else None
    )
    
    db.session.add(new_score)
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'is_new_highscore': is_new_highscore,
        'score': score
    })


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    if 'user_id' not in session:
        return False
    print(f"Client connected: {request.sid}")

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data['room_code']
    
    if room_code not in game_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    join_room(room_code)
    
    player_info = {
        'id': session['user_id'],
        'username': session['username'],
        'sid': request.sid
    }
    
    # Update player's socket ID if they're already in the room
    player_exists = False
    for player in game_rooms[room_code]['players']:
        if player['id'] == session['user_id']:
            player['sid'] = request.sid
            player_exists = True
            break
    
    # Add player to the room if not already in
    if not player_exists:
        game_rooms[room_code]['players'].append(player_info)
    
    # Notify everyone in the room
    emit('player_joined', {
        'player': player_info,
        'players': game_rooms[room_code]['players'],
        'host_id': game_rooms[room_code]['host_id']
    }, to=room_code)

@socketio.on('get_players')
def handle_get_players(data):
    room_code = data['room_code']
    
    if room_code not in game_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    emit('player_joined', {
        'players': game_rooms[room_code]['players'],
        'host_id': game_rooms[room_code]['host_id']
    })

@socketio.on('start_game')
def handle_start_game(data):
    room_code = data['room_code']
    
    if room_code not in game_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    if session['user_id'] != game_rooms[room_code]['host_id']:
        emit('error', {'message': 'Only the host can start the game'})
        return
    
    game_rooms[room_code]['status'] = 'playing'
    emit('game_started', {}, to=room_code)

@socketio.on('game_update')
def handle_game_update(data):
    room_code = data['room_code']
    game_state = data['game_state']
    
    if room_code not in game_rooms:
        return
    
    # Broadcast game state to all players in the room except sender
    emit('game_update', {
        'player_id': session['user_id'],
        'game_state': game_state
    }, to=room_code, include_self=False)

@socketio.on('game_over')
def handle_game_over(data):
    room_code = data['room_code']
    score = data['score']
    
    if room_code not in game_rooms:
        return
    
    # Save highscore
    new_highscore = Highscore(
        player_id=session['user_id'],
        score=score
    )
    db.session.add(new_highscore)
    db.session.commit()
    
    # Mark this player as game over
    for player in game_rooms[room_code]['players']:
        if player['id'] == session['user_id']:
            player['game_over'] = True
    
    # Notify all players in the room
    emit('player_game_over', {
        'player_id': session['user_id'],
        'username': session['username'],
        'score': score
    }, to=room_code)
    
    # Check if only one player is still active
    active_players = [p for p in game_rooms[room_code]['players'] if not p.get('game_over', False)]
    
    if len(active_players) == 1:
        # Last player standing wins
        winner_id = active_players[0]['id']
        winner_sid = active_players[0]['sid']
        winner_username = active_players[0]['username']
        
        # Send win message to the winner
        emit('you_win', {
            'username': winner_username,
            'score': score
        }, room=winner_sid)
        
        # After 5 seconds, redirect everyone back to waiting room
        socketio.sleep(5)
        game_rooms[room_code]['status'] = 'waiting'
        emit('return_to_waiting', {}, to=room_code)


@socketio.on('disconnect')
def handle_disconnect(reason=None):
    print(f"Client disconnected: {request.sid}, reason: {reason}")
    
    # Remove player from any game rooms they were in
    for room_code, room_data in list(game_rooms.items()):
        for player in list(room_data['players']):
            if player['sid'] == request.sid:
                room_data['players'].remove(player)
                emit('player_left', {
                    'player_id': player['id'],
                    'username': player['username']
                }, to=room_code)
                
                # If host left and game hasn't started, close the room
                if room_data['host_id'] == player['id'] and room_data['status'] == 'waiting':
                    emit('room_closed', {'message': 'Host has left the game'}, to=room_code)
                    if room_code in game_rooms:  # Check if room still exists
                        del game_rooms[room_code]
                    break
                
                # If room is empty and game hasn't started, remove it
                if not room_data['players'] and room_data['status'] == 'waiting':
                    if room_code in game_rooms:  # Check if room still exists
                        del game_rooms[room_code]
                    break



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app)
